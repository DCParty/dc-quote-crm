// src/components/PDFContent.jsx
import React from 'react';

export default function PDFContent({ id = "pdf-content", data }) {
    if (!data || !data.items) return null;
    
    const { clientName, clientPhone, quoteNo, date, items, companyInfo, note, title, taxRate, discount } = data;
    const subtotal = items.reduce((sum, i) => i.type === 'text' ? sum : sum + (i.quantity * i.unitPrice), 0);
    const taxable = subtotal - (discount || 0);
    const tax = Math.round(taxable * (taxRate || 0.05));
    const total = taxable + tax;

    // ... (這裡為了節省篇幅，請直接複製原本 HTML 中 PDFContent 的 return 內容，完全一樣) ...
    // 記得 return 的內容要包在 <div id={id} className="pdf-page text-base relative"> ... </div>
    return (
        <div id={id} className="pdf-page text-base relative">
            <div className="flex justify-between items-start mb-12">
                {/* ... PDF Header ... */}
                 <div className="flex gap-6">
                    {companyInfo?.logo && <img src={companyInfo.logo} alt="Logo" className="w-20 h-20 object-contain" />}
                    <div>
                        <h1 className="text-5xl font-bold text-black mb-2 tracking-tight" style={{color: '#FF5F1F'}}>{title || "QUOTATION"}</h1>
                        <p className="text-gray-500 font-bold text-lg">NO: {quoteNo}</p>
                        <p className="text-gray-500 text-lg">DATE: {date}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-black">{companyInfo?.name || "COMPANY"}</h2>
                    <p className="text-gray-500 mt-1 max-w-xs ml-auto">{companyInfo?.description}</p>
                    <p className="text-gray-600 mt-4">{companyInfo?.address}</p>
                    <p className="text-gray-600">統編：{companyInfo?.taxId} | TEL: {companyInfo?.phone}</p>
                    <div className="text-orange-500 font-bold mt-1">{companyInfo?.website}</div>
                </div>
            </div>

            <div className="border-l-8 border-orange-500 pl-6 mb-10 bg-gray-50 py-6">
                <div className="grid grid-cols-2 gap-8">
                    <div><h3 className="font-bold text-gray-400 text-sm uppercase mb-1">Client</h3><div className="text-2xl font-bold text-gray-900">{clientName}</div></div>
                    {clientPhone && <div><h3 className="font-bold text-gray-400 text-sm uppercase mb-1">Phone</h3><div className="text-xl text-gray-800">{clientPhone}</div></div>}
                </div>
            </div>

            <table className="w-full mb-10 border-collapse">
                <thead className="bg-black text-white font-bold uppercase text-sm">
                    <tr>
                        <th className="text-left py-4 px-6">項目</th>
                        <th className="text-center py-4 w-20">單位</th>
                        <th className="text-right py-4 w-28">數量</th>
                        <th className="text-right py-4 w-40">單價</th>
                        <th className="text-right py-4 px-6 w-40">金額</th>
                    </tr>
                </thead>
                <tbody className="text-gray-700 text-lg">
                    {items.map((item, index) => {
                        if (item.type === 'text') {
                            return (
                                <tr key={index} className="border-b border-gray-200 bg-gray-50">
                                    <td colSpan="5" className="py-4 px-6 font-bold text-gray-800 whitespace-pre-wrap">{item.description}</td>
                                </tr>
                            );
                        }
                        return (
                            <tr key={index} className="border-b border-gray-200">
                                <td className="py-4 px-6 font-medium">{item.description}</td>
                                <td className="py-4 text-center text-gray-500">{item.unit}</td>
                                <td className="py-4 text-right text-gray-500">{item.quantity}</td>
                                <td className="py-4 text-right">{item.unitPrice.toLocaleString()}</td>
                                <td className="py-4 px-6 text-right font-bold text-black">{(item.quantity * item.unitPrice).toLocaleString()}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="flex justify-end mb-10">
                <div className="w-1/2 space-y-3 border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-gray-600 text-lg"><span>Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
                    {discount > 0 && <div className="flex justify-between text-green-600 text-lg"><span>Discount</span><span>-${discount.toLocaleString()}</span></div>}
                    <div className="flex justify-between text-gray-600 text-lg"><span>Tax ({(taxRate||0.05)*100}%)</span><span>${tax.toLocaleString()}</span></div>
                    <div className="flex justify-between text-4xl font-bold text-black mt-4 pt-4 border-t border-black"><span>TOTAL</span><span style={{color: '#FF5F1F'}}>${total.toLocaleString()}</span></div>
                </div>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl text-base text-gray-500">
                <h4 className="font-bold mb-3 text-black uppercase text-lg">REMARKS / PAYMENT INFO</h4>
                <pre className="whitespace-pre-wrap font-sans text-gray-600">{note}</pre>
            </div>
        </div>
    );
}