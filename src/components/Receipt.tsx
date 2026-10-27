import { dateTime } from "@/lib/api";

const PAY: Record<string, string> = { cash: "Cash", momo: "Mobile money", card: "Card", credit: "On account", loyalty: "Points" };

export function Receipt({ sale, branch }: { sale: any; branch: any }) {
  return (
    <div className="receipt mx-auto rounded border border-dashed border-slate-300 p-3">
      <div className="text-center font-bold">{branch.receiptHeader || branch.name}</div>
      <div className="text-center">{branch.address}</div><div className="text-center">{branch.phone}</div>{branch.taxId && <div className="text-center">TIN {branch.taxId}</div>}
      <hr className="my-2 border-dashed" />
      {sale.offline && <div className="font-bold">** RECORDED OFFLINE - PENDING SYNC **</div>}
      <div>Receipt {sale.receiptNo}</div><div>{dateTime(sale.createdAt)}</div><div>Served by {sale.cashier?.name}</div>
      <hr className="my-2 border-dashed" />
      {sale.items.map((i: any, k: number) => (<div key={k}><div>{i.name}</div><div className="flex justify-between"><span>{i.qty} x {i.unitPrice.toFixed(2)}{i.tax ? ` (tax ${i.tax.toFixed(2)})` : ""}</span><span>{i.lineTotal.toFixed(2)}</span></div></div>))}
      <hr className="my-2 border-dashed" />
      <div className="flex justify-between"><span>Subtotal</span><span>{sale.subtotal.toFixed(2)}</span></div>
      {sale.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{sale.discount.toFixed(2)}</span></div>}
      <div className="flex justify-between"><span>Tax</span><span>{sale.tax.toFixed(2)}</span></div>
      <div className="flex justify-between text-sm font-bold"><span>TOTAL GH₵</span><span>{sale.total.toFixed(2)}</span></div>
      {sale.payments.map((p: any, k: number) => <div key={k} className="flex justify-between"><span>{PAY[p.method] || p.method}</span><span>{p.amount.toFixed(2)}</span></div>)}
      {sale.changeGiven > 0 && <div className="flex justify-between"><span>Change</span><span>{sale.changeGiven.toFixed(2)}</span></div>}
      <div className="mt-2 text-center">Thank you</div>
    </div>
  );
}
