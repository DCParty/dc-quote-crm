import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export default function PDFContent({ id = "pdf-content", data }) {
    if (!data) return null;
    const { clientName, clientPhone, quoteNo, date, items, companyInfo, note, title, taxRate, discount } = data;
    
    const safeItems = items || [];
    
    const subtotal = safeItems.reduce((sum, i) => i.type === 'text' ? sum : sum + (i.quantity * i.unitPrice), 0);
    const taxable = subtotal - (discount || 0);
    const tax = Math.round(taxable * (taxRate || 0.05));
    const total = taxable + tax;

    // 確保網址有效，若無則使用預設
    const websiteUrl = (companyInfo?.websites && companyInfo.websites[0]) || companyInfo?.website || "https://google.com";

    return (
        <div id={id} className="pdf-page text-base relative bg-white text-black" style={{ width: '210mm', minHeight: '297mm', padding: '20mm', margin: '0 auto' }}>
            {/* Header Section: Logo, Company Info, QR Code */}
            <div className="flex justify-between items-start mb-10 border-b-2 border-gray-800 pb-6">
                {/* Left: Logo & Quote Details */}
                <div className="flex flex-col gap-4">
                    {companyInfo?.logo && (
                        <img src={companyInfo.logo} alt="Logo" className="h-20 object-contain w-auto self-start" style={{ maxWidth: '200px' }} />
                    )}
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-dc-orange uppercase mb-1">{title || "QUOTATION"}</h1>
                        <div className="text-gray-600 font-mono text-sm">
                            <p>單號 NO: <span className="text-black font-bold">{quoteNo}</span></p>
                            <p>日期 DATE: <span className="text-black font-bold">{date}</span></p>
                        </div>
                    </div>
                </div>

                {/* Right: Company Details & QR */}
                <div className="text-right flex flex-col items-end">
                    <h2 className="text-2xl font-bold text-black mb-1">{companyInfo?.name || "COMPANY NAME"}</h2>
                    <div className="text-sm text-gray-600 leading-relaxed mb-3">
                        <p>{companyInfo?.description}</p>
                        <p>{companyInfo?.address}</p>
                        <p className="font-bold text-black">統編: {companyInfo?.taxId} | TEL: {companyInfo?.phone}</p>
                        
                        {/* 顯示所有網站 */}
                        <div className="flex flex-col items-end">
                             {companyInfo?.websites && companyInfo.websites.length > 0 ? (
                                companyInfo.websites.map((site, i) => <a key={i} href={site} className="text-dc-orange block underline text-xs">{site}</a>)
                            ) : (
                                <a href={companyInfo?.website} className="text-dc-orange underline text-xs">{companyInfo?.website}</a>
                            )}
                        </div>
                    </div>
                    
                    {/* QR Code Section */}
                    <div className="flex flex-col items-center gap-1 mt-2">
                        <div className="p-1 border border-gray-200 rounded bg-white">
                            <QRCodeCanvas value={websiteUrl} size={80} />
                        </div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest">Scan to Visit</span>
                    </div>
                </div>
            </div>

            {/* Client Info Section */}
            <div className="flex justify-between mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To (客戶資訊)</h3>
                    <div className="text-xl font-bold text-gray-900">{clientName}</div>
                    <div className="text-gray-600 mt-1">{clientPhone}</div>
                    <div className="text-gray-600">{data.clientEmail}</div>
                </div>
                <div className="text-right">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Grand Total (總計)</h3>
                    <div className="text-4xl font-bold text-dc-orange">${total.toLocaleString()}</div>
                    <div className="text-xs text-gray-400 mt-1">含稅 (Tax Included)</div>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-8 border-collapse">
                <thead>
                    <tr className="border-b-2 border-black">
                        <th className="text-left py-3 px-4 font-bold text-sm uppercase tracking-wider">項目 (Description)</th>
                        <th className="text-center py-3 w-20 font-bold text-sm uppercase">單位</th>
                        <th className="text-right py-3 w-24 font-bold text-sm uppercase">數量</th>
                        <th className="text-right py-3 w-32 font-bold text-sm uppercase">單價</th>
                        <th className="text-right py-3 px-4 w-32 font-bold text-sm uppercase">金額</th>
                    </tr>
                </thead>
                <tbody className="text-gray-700 text-sm">
                    {safeItems.map((item, index) => {
                        if (item.type === 'text') {
                            return (
                                <tr key={index} className="border-b border-gray-100">
                                    <td colSpan="5" className="py-4 px-4 font-bold text-gray-800 bg-gray-50 whitespace-pre-wrap text-base">{item.description}</td>
                                </tr>
                            );
                        }
                        return (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-4 font-medium text-base">{item.description}</td>
                                <td className="py-4 text-center text-gray-500">{item.unit}</td>
                                <td className="py-4 text-right text-gray-500">{item.quantity}</td>
                                <td className="py-4 text-right font-mono">${item.unitPrice.toLocaleString()}</td>
                                <td className="py-4 px-4 text-right font-bold text-black font-mono">${(item.quantity * item.unitPrice).toLocaleString()}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Totals Section */}
            <div className="flex justify-end mb-12">
                <div className="w-64 space-y-3">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal (小計)</span>
                        <span className="font-mono">${subtotal.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Discount (折扣)</span>
                            <span className="font-mono">-${discount.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-3">
                        <span>Tax (稅金 {(taxRate||0.05)*100}%)</span>
                        <span className="font-mono">${tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-black pt-1">
                        <span>Total</span>
                        <span className="text-dc-orange font-mono">${total.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Remarks / Footer */}
            <div className="mt-auto">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <h4 className="font-bold mb-3 text-black uppercase text-xs tracking-widest">Notes & Payment Info (備註與匯款資訊)</h4>
                    <pre className="whitespace-pre-wrap font-sans text-gray-600 text-sm leading-relaxed">{note}</pre>
                </div>
                <div className="text-center mt-8 text-[10px] text-gray-300 uppercase tracking-widest">
                    Thank you for your business
                </div>
            </div>
        </div>
    );
}