// Offline support for the till (NFR-05): a catalogue snapshot and a queue of sales made without
// internet, both kept in IndexedDB on the device. Sales sync to the server when the connection returns.
const DB = "pharmaone-pos";
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("catalog", { keyPath: "branch" });
      db.createObjectStore("queue", { keyPath: "clientId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => resolve((r ? (r as IDBRequest<T>).result : undefined) as T);
    t.onerror = () => reject(t.error);
  });
}

export type OfflineProduct = { _id: string; brand: string; generic?: string; strength?: string; barcode?: string; legalStatus: string; taxRate: number; price: number; stock: number; nextExpiry?: string };
export type QueuedSale = { clientId: string; branch: string; createdAt: string; items: { product: string; qty: number }[]; payments: { method: string; amount: number }[]; discount: number; customer?: string; receipt: any; status: "pending" | "rejected"; error?: string };

export const saveCatalog = (branch: string, at: string, products: OfflineProduct[]) => tx("catalog", "readwrite", (s) => s.put({ branch, at, products }));
export const loadCatalog = (branch: string) => tx<{ branch: string; at: string; products: OfflineProduct[] } | undefined>("catalog", "readonly", (s) => s.get(branch));
export const queueSale = (sale: QueuedSale) => tx("queue", "readwrite", (s) => s.put(sale));
export const listQueue = (branch?: string) => tx<QueuedSale[]>("queue", "readonly", (s) => s.getAll()).then((all) => (branch ? all.filter((q) => q.branch === branch) : all));
export const removeQueued = (clientId: string) => tx("queue", "readwrite", (s) => s.delete(clientId));

export const newClientId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Reduce the local stock figure after an offline sale so the cashier cannot keep selling what is gone.
export async function adjustLocalStock(branch: string, items: { product: string; qty: number }[]) {
  const c = await loadCatalog(branch);
  if (!c) return;
  for (const i of items) { const p = c.products.find((x) => x._id === i.product); if (p) p.stock = Math.max(0, p.stock - i.qty); }
  await saveCatalog(branch, c.at, c.products);
}
