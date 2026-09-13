"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SellPage() {
  // รายการสินค้าทั้งหมด สำหรับ dropdown
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // สินค้าที่เลือก และจำนวนที่จะขาย
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selling, setSelling] = useState(false);

  // โหลดรายการสินค้าเมื่อ mount
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setError("โหลดข้อมูลสินค้าไม่สำเร็จ: " + error.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  // หาสินค้าที่ถูกเลือกจาก id
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // คำนวณยอดรวมอัตโนมัติ
  const parsedQuantity = parseInt(quantity, 10);
  const totalPrice =
    selectedProduct && parsedQuantity > 0
      ? selectedProduct.price * parsedQuantity
      : 0;

  function resetForm() {
    setSelectedProductId("");
    setQuantity("");
  }

  // กดปุ่ม "ขาย"
  async function handleSell(e) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!selectedProductId) {
      setError("กรุณาเลือกสินค้า");
      return;
    }
    if (!parsedQuantity || parsedQuantity <= 0) {
      setError("กรุณากรอกจำนวนให้ถูกต้อง");
      return;
    }
    if (!selectedProduct) {
      setError("ไม่พบสินค้าที่เลือก");
      return;
    }

    // ตรวจสอบ stock เพียงพอหรือไม่
    if (parsedQuantity > selectedProduct.stock) {
      setError(
        `จำนวนคงเหลือไม่พอ (คงเหลือ ${selectedProduct.stock} ${selectedProduct.unit})`
      );
      return;
    }

    setSelling(true);

    // 1. บันทึกรายการลงตาราง sales
    const { error: saleError } = await supabase.from("sales").insert([
      {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: parsedQuantity,
        total_price: totalPrice,
        sold_at: new Date().toISOString(),
      },
    ]);

    if (saleError) {
      setError("บันทึกการขายไม่สำเร็จ: " + saleError.message);
      setSelling(false);
      return;
    }

    // 2. อัปเดต stock ในตาราง products ให้ลดลง
    const newStock = selectedProduct.stock - parsedQuantity;
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", selectedProduct.id);

    if (updateError) {
      setError(
        "บันทึกการขายสำเร็จ แต่ปรับปรุงจำนวนคงเหลือไม่สำเร็จ: " +
          updateError.message
      );
      setSelling(false);
      return;
    }

    // สำเร็จ: แสดงข้อความยืนยัน รีเซ็ตฟอร์ม และโหลดข้อมูลสินค้าใหม่
    setSuccessMessage(
      `ขาย "${selectedProduct.name}" จำนวน ${parsedQuantity} ${selectedProduct.unit} สำเร็จ (รวม ${totalPrice.toFixed(
        2
      )} บาท)`
    );
    resetForm();
    fetchProducts();
    setSelling(false);
  }

  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>ขายสินค้า</h1>

      {error && (
        <p className="error" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      )}
      {successMessage && (
        <p className="success" style={{ marginBottom: "1rem" }}>
          {successMessage}
        </p>
      )}

      <div className="card">
        {loading ? (
          <p>กำลังโหลดข้อมูลสินค้า...</p>
        ) : products.length === 0 ? (
          <p>ยังไม่มีสินค้าในระบบ กรุณาเพิ่มสินค้าที่หน้าแรกก่อน</p>
        ) : (
          <form onSubmit={handleSell}>
            {/* Dropdown เลือกสินค้า */}
            <div className="form-row">
              <label htmlFor="product-select" style={{ minWidth: "80px" }}>
                เลือกสินค้า:
              </label>
              <select
                id="product-select"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                style={{ minWidth: "220px" }}
              >
                <option value="">-- กรุณาเลือกสินค้า --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({Number(product.price).toFixed(2)} บาท/{product.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* แสดงข้อมูลสต็อกคงเหลือของสินค้าที่เลือก */}
            {selectedProduct && (
              <p style={{ marginBottom: "0.75rem", color: "#6b7280", fontSize: "0.9rem" }}>
                คงเหลือ: {selectedProduct.stock} {selectedProduct.unit}
              </p>
            )}

            {/* ช่องกรอกจำนวน */}
            <div className="form-row">
              <label htmlFor="quantity-input" style={{ minWidth: "80px" }}>
                จำนวน:
              </label>
              <input
                id="quantity-input"
                type="number"
                min="1"
                placeholder="จำนวน"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: "120px" }}
              />
            </div>

            {/* แสดงยอดรวมอัตโนมัติ */}
            <div
              style={{
                margin: "1rem 0",
                padding: "0.75rem 1rem",
                backgroundColor: "#f3f4f6",
                borderRadius: "6px",
                fontSize: "1.1rem",
                fontWeight: "600",
              }}
            >
              ยอดรวม: {totalPrice.toFixed(2)} บาท
            </div>

            <button type="submit" disabled={selling}>
              {selling ? "กำลังบันทึก..." : "ขาย"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
