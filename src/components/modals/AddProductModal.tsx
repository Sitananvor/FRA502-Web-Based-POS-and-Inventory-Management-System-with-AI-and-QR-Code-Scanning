"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { FormField } from "../../../src/components/ui/FormField";
import {
  addProductAction,
  getCategoriesAction,
} from "../../../src/actions/Inventory";
import type { Category } from "../../../src/types";

interface FormState {
  name: string;
  brand: string;
  category_id: string;
  price: string;
  min_stock: string;
  qr_code: string;
}
const INITIAL_FORM: FormState = {
  name: "",
  brand: "",
  category_id: "",
  price: "",
  min_stock: "",
  qr_code: "",
};

const INPUT_CLS =
  "w-full px-3 py-2 text-sm border border-[#BFDBFE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/30 bg-white text-gray-800 placeholder:text-gray-400";
const INPUT_ERR = "border-red-400 focus:ring-red-400";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddProductModal({
  isOpen,
  onClose,
  onSuccess,
}: AddProductModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    async function fetchCategories() {
      try {
        const data = await getCategoriesAction();
        setCategories(data ?? []);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    }
    fetchCategories();
  }, [isOpen]);

  if (!isOpen) return null;

  function handleClose() {
    setForm(INITIAL_FORM);
    setErrors({});
    setServerError("");
    onClose();
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name as keyof FormState])
      setErrors((p) => ({ ...p, [name]: "" }));
    if (serverError) setServerError("");
  }

  function validate(): Partial<FormState> {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = "Product name is required";
    if (!form.category_id) e.category_id = "Please select a category";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
      e.price = "Please enter a valid price";
    if (
      !form.min_stock ||
      isNaN(Number(form.min_stock)) ||
      Number(form.min_stock) < 0
    )
      e.min_stock = "Please enter a valid min stock";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ve = validate();
    if (Object.keys(ve).length > 0) {
      setErrors(ve);
      return;
    }

    setIsSubmitting(true);
    setServerError("");
    try {
      const result = await addProductAction({
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        category_id: Number(form.category_id),
        price: Number(form.price),
        min_stock: Number(form.min_stock),
        qr_code: form.qr_code.trim() || null,
      });

      if (!result.success) {
        setServerError(result.error ?? "An error occurred. Please try again.");
        return;
      }

      setForm(INITIAL_FORM);
      setErrors({});
      onSuccess();
      onClose();
    } catch (err: any) {
      setServerError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-110 px-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#EBF4FF]">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Add New Product
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Enter product details
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-[#EBF4FF] text-gray-400 hover:text-[#0F4C81] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pt-4 pb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FormField label="Product Name" required error={errors.name}>
                <input
                  className={`${INPUT_CLS} ${errors.name ? INPUT_ERR : ""}`}
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Paracetamol 500mg"
                />
              </FormField>
            </div>
            <FormField label="Brand">
              <input
                className={INPUT_CLS}
                type="text"
                name="brand"
                value={form.brand}
                onChange={handleChange}
                placeholder="e.g. Tylenol"
              />
            </FormField>
            <FormField label="Category" required error={errors.category_id}>
              <select
                className={`${INPUT_CLS} ${errors.category_id ? INPUT_ERR : ""}`}
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Price (THB)" required error={errors.price}>
              <input
                className={`${INPUT_CLS} ${errors.price ? INPUT_ERR : ""}`}
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </FormField>
            <FormField label="Min Stock" error={errors.min_stock}>
              <input
                className={`${INPUT_CLS} ${errors.min_stock ? INPUT_ERR : ""}`}
                type="number"
                name="min_stock"
                value={form.min_stock}
                onChange={handleChange}
                placeholder="0"
                min="0"
              />
            </FormField>
            <div className="col-span-2">
              <FormField label="Product QR" error={errors.qr_code}>
                <input
                  className={`${INPUT_CLS} ${errors.qr_code ? INPUT_ERR : ""}`}
                  type="text"
                  name="qr_code"
                  value={form.qr_code}
                  onChange={handleChange}
                  placeholder="QR code (optional)"
                />
              </FormField>
            </div>
          </div>

          {serverError && (
            <p className="text-sm text-red-500 mt-3 px-1">{serverError}</p>
          )}

          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-[#EBF4FF]">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-lg bg-[#EBF4FF] hover:bg-[#BFDBFE] text-[#0F4C81] font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-lg bg-[#1767AD] hover:bg-[#0F4C81] text-white font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}