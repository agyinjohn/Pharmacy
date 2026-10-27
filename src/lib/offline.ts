// Offline support (NFR-05): catalogue and prescription snapshots plus a queue of operations made
// without internet (sales, goods received, dispensing), all kept in IndexedDB on the device.
// The queue is sent to POST /offline/sync when the connection returns (see OfflineProvider).
const DB = "pharmaone-pos";
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("catalog")) db.createObjectStore("catalog", { keyPath: "branch" });
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "clientId" });
      if (!db.objectStoreNames.contains("rx")) db.createObjectStore("rx", { keyPath: "key" });
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
export type OpKind = "sale" | "receipt" | "dispense";
export type QueuedOp = { clientId: string; kind: OpKind; branch: string; createdAt: string; payload: any; label: string; receipt?: any; status: "pending" | "rejected"; error?: string };

export const saveCatalog = (branch: string, at: string, products: OfflineProduct[]) => tx("catalog", "readwrite", (s) => s.put({ branch, at, products }));
export const loadCatalog = (branch: string) => tx<{ branch: string; at: string; products: OfflineProduct[] } | undefined>("catalog", "readonly", (s) => s.get(branch));
export const saveRxSnapshot = (org: string, at: string, prescriptions: any[]) => tx("rx", "readwrite", (s) => s.put({ key: org, at, prescriptions }));
export const loadRxSnapshot = (org: string) => tx<{ at: string; prescriptions: any[] } | undefined>("rx", "readonly", (s) => s.get(org));

// Sales queued by the first offline version had their fields at the top level; normalise them.
const normalise = (q: any): QueuedOp => (q.kind ? q : { clientId: q.clientId, kind: "sale", branch: q.branch, createdAt: q.createdAt, payload: { items: q.items, payments: q.payments, discount: q.discount, customer: q.customer }, label: q.receipt?.receiptNo || "Sale", receipt: q.receipt, status: q.status, error: q.error });

export const queueOp = (op: QueuedOp) => tx("queue", "readwrite", (s) => s.put(op));
export const listQueue = (branch?: string) => tx<any[]>("queue", "readonly", (s) => s.getAll()).then((all) => all.map(normalise).filter((q) => !branch || q.branch === branch));
export const removeQueued = (clientId: string) => tx("queue", "readwrite", (s) => s.delete(clientId));

export const newClientId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Keep the local stock figure honest after offline sales and receipts.
export async function adjustLocalStock(branch: string, items: { product: string; qty: number }[], sign = -1) {
  const c = await loadCatalog(branch);
  if (!c) return;
  for (const i of items) { const p = c.products.find((x) => x._id === i.product); if (p) p.stock = Math.max(0, p.stock + sign * i.qty); }
  await saveCatalog(branch, c.at, c.products);
}
