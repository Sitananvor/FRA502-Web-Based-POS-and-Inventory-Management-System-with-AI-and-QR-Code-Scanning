"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { FormField } from "../../../src/components/ui/FormField";
import { addBatchAction } from "../../../src/actions/Batch"; 

interface FormState { batch_number: string; batch_qr: string; stock_amount: string; received_date: string; expiry_date: string; }
const INITIAL_FORM: FormState = { batch_number: "", batch_qr: "", stock_amount: "", received_date: "", expiry_date: "" };

const INPUT_CLS = "w-full px-3 py-2 text-sm border border-[#BFDBFE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/30 bg-white text-gray-800 placeholder:text-gray-400";
const INPUT_ERR = "border-red-400 focus:ring-red-400";

interface AddBatchModalProps { isOpen: boolean; productId: string | number; productName?: string; productBrand?: string | null; onClose: () => void; onSuccess: () => void; }

export default function AddBatchModal({ isOpen, productId, productName = "Product", productBrand, onClose, onSuccess }: AddBatchModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  if (!isOpen) return null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name as keyof FormState]) setErrors(p => ({ ...p, [name]: "" }));
  }

  function validate(): Partial<FormState> {
    const e: Partial<FormState> = {};
    if (!form.stock_amount || isNaN(Number(form.stock_amount)) || Number(form.stock_amount) < 0) e.stock_amount = "Valid stock amount required";
    if (!form.received_date) e.received_date = "Received date required";
    if (form.expiry_date && form.received_date && form.expiry_date < form.received_date) e.expiry_date = "Expiry must be after received date";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ve = validate();
    if (Object.keys(ve).length > 0) { setErrors(ve); return; }
    
    setIsSubmitting(true);
    try {
      await addBatchAction({
        product_id: productId,
        stock_amount: Number(form.stock_amount),
        batch_number: form.batch_number || null,
        batch_qr: form.batch_qr || null,
        received_date: form.received_date,
        expiry_date: form.expiry_date || null
      });

      setForm(INITIAL_FORM); 
      setErrors({});
      onSuccess(); 
      onClose();
    } catch (err) {
      console.error("AddBatchModal", err);
      alert("Failed to add batch.");
    } finally { 
      setIsSubmitting(false); 
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#EBF4FF]">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Add New Batch</h2>
            <p className="text-sm text-gray-400 mt-0.5">{productName}{productBrand ? ` (${productBrand})` : ""}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#EBF4FF] text-gray-400 hover:text-[#0F4C81] transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pt-4 pb-6">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Batch Number"><input className={INPUT_CLS} type="text" name="batch_number" value={form.batch_number} onChange={handleChange} placeholder="e.g. BT-2026-001" /></FormField>
            <FormField label="Batch QR"><input className={INPUT_CLS} type="text" name="batch_qr" value={form.batch_qr} onChange={handleChange} placeholder="Batch QR code" /></FormField>
            <FormField label="Stock Quantity" required error={errors.stock_amount}><input className={`${INPUT_CLS} ${errors.stock_amount ? INPUT_ERR : ""}`} type="number" name="stock_amount" value={form.stock_amount} onChange={handleChange} placeholder="0" min="0" /></FormField>
            <FormField label="Received Date" required error={errors.received_date}><input className={`${INPUT_CLS} ${errors.received_date ? INPUT_ERR : ""}`} type="date" name="received_date" value={form.received_date} onChange={handleChange} /></FormField>
            <div className="col-span-2"><FormField label="Expiry Date" error={errors.expiry_date}><input className={`${INPUT_CLS} ${errors.expiry_date ? INPUT_ERR : ""}`} type="date" name="expiry_date" value={form.expiry_date} onChange={handleChange} /></FormField></div>
          </div>

          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-[#EBF4FF]">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-lg bg-[#EBF4FF] hover:bg-[#BFDBFE] text-[#0F4C81] font-medium transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-lg bg-[#1767AD] hover:bg-[#0F4C81] text-white font-medium transition-colors disabled:opacity-50">
              {isSubmitting ? "Saving..." : "Add Batch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}