"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
export default function SellPage() {
  // รายการสินค้าทั้งหมด สำหรับ dropdown
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ฟอร์มเพิ่มสินค้าเข้าตะกร้า
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");

  // ตะกร้าสินค้า: [{ productId, sku, name, unit, price, stock, quantity }]
  const [cart, setCart] = useState([]);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selling, setSelling] = useState(false);

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

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // ยอดรวมทั้งตะกร้า
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // เพิ่มสินค้าเข้าตะกร้า
  function handleAddToCart(e) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const parsedQuantity = parseInt(quantity, 10);

    if (!selectedProduct) {
      setError("กรุณาเลือกสินค้า");
      return;
    }
    if (!parsedQuantity || parsedQuantity <= 0) {
      setError("กรุณากรอกจำนวนให้ถูกต้อง");
      return;
    }

    // จำนวนที่ขอเพิ่ม รวมกับที่มีอยู่แล้วในตะกร้า (ถ้าสินค้าชิ้นนี้ถูกเลือกซ้ำ)
    const existingItem = cart.find((item) => item.productId === selectedProduct.id);
    const alreadyInCart = existingItem ? existingItem.quantity : 0;
    const totalRequested = alreadyInCart + parsedQuantity;

    if (totalRequested > selectedProduct.stock) {
      setError(
        `จำนวนคงเหลือไม่พอ (คงเหลือ ${selectedProduct.stock} ${selectedProduct.unit}, มีในตะกร้าแล้ว ${alreadyInCart})`
      );
      return;
    }

    if (existingItem) {
      // ถ้ามีสินค้านี้ในตะกร้าอยู่แล้ว ให้รวมจำนวน
      setCart((prev) =>
        prev.map((item) =>
          item.productId === selectedProduct.id
            ? { ...item, quantity: totalRequested }
            : item
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          productId: selectedProduct.id,
          sku: selectedProduct.sku,
          name: selectedProduct.name,
          unit: selectedProduct.unit,
          price: selectedProduct.price,
          stock: selectedProduct.stock,
          quantity: parsedQuantity,
        },
      ]);
    }

    // รีเซ็ตฟอร์มเพิ่มสินค้า (ไม่ล้าง error/success)
    setSelectedProductId("");
    setQuantity("");
  }

  // ลบสินค้าออกจากตะกร้า
  function handleRemoveFromCart(productId) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  // แก้ไขจำนวนของสินค้าในตะกร้า
  function handleChangeCartQuantity(productId, newQuantity) {
    const parsed = parseInt(newQuantity, 10);
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        if (!parsed || parsed <= 0) return item;
        return { ...item, quantity: Math.min(parsed, item.stock) };
      })
    );
  }

  function resetAll() {
    setCart([]);
    setSelectedProductId("");
    setQuantity("");
  }

  // ยืนยันการขายทั้งตะกร้า
  async function handleConfirmSale() {
    setError("");
    setSuccessMessage("");

    if (cart.length === 0) {
      setError("ยังไม่มีสินค้าในตะกร้า");
      return;
    }

    setSelling(true);

    // ตรวจสอบ stock ล่าสุดอีกครั้งก่อนบันทึกจริง (กันกรณีข้อมูลเปลี่ยนระหว่างทาง)
    const { data: freshProducts, error: fetchError } = await supabase
      .from("products")
      .select("id, stock")
      .in(
        "id",
        cart.map((item) => item.productId)
      );

    if (fetchError) {
      setError("ตรวจสอบสต็อกไม่สำเร็จ: " + fetchError.message);
      setSelling(false);
      return;
    }

    for (const item of cart) {
      const fresh = freshProducts.find((p) => p.id === item.productId);
      if (!fresh || item.quantity > fresh.stock) {
        setError(
          `"${item.name}" คงเหลือไม่พอ (คงเหลือจริง ${fresh ? fresh.stock : 0} ${item.unit})`
        );
        setSelling(false);
        return;
      }
    }

    // 1. บันทึกทุกรายการลงตาราง sales
    const soldAt = new Date().toISOString();
    const salesRows = cart.map((item) => ({
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      total_price: item.price * item.quantity,
      sold_at: soldAt,
    }));

    const { error: saleError } = await supabase.from("sales").insert(salesRows);

    if (saleError) {
      setError("บันทึกการขายไม่สำเร็จ: " + saleError.message);
      setSelling(false);
      return;
    }

    // 2. อัปเดต stock ของสินค้าแต่ละรายการ
    for (const item of cart) {
      const fresh = freshProducts.find((p) => p.id === item.productId);
      const newStock = fresh.stock - item.quantity;
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.productId);

      if (updateError) {
        setError(
          `บันทึกการขายสำเร็จบางส่วน แต่ปรับปรุงสต็อก "${item.name}" ไม่สำเร็จ: ` +
            updateError.message
        );
        setSelling(false);
        fetchProducts();
        return;
      }
    }

    setSuccessMessage(
      `ขายสำเร็จ ${cartItemCount} ชิ้น รวม ${cartTotal.toFixed(2)} บาท`
    );
    resetAll();
    fetchProducts();
    setSelling(false);
  }

  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>ขายสินค้า</h1>

      {/* กล่องยอดรวมตัวใหญ่ อยู่บนสุด อ่านง่ายทั้งฝั่งผู้ขายและผู้ซื้อ */}
      <div className="pos-total-box">
        <div className="pos-total-label">ยอดรวมทั้งหมด</div>
        <div className="pos-total-amount">{cartTotal.toFixed(2)} บาท</div>
        <div className="pos-total-sub">
          {cartItemCount > 0 ? `${cartItemCount} ชิ้น ใน ${cart.length} รายการ` : "ยังไม่มีสินค้าในตะกร้า"}
        </div>
      </div>

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

      <div className="pos-layout">
        {/* ฝั่งซ้าย: เลือกสินค้าเพิ่มเข้าตะกร้า */}
        <div className="card">
          <h2 style={{ marginBottom: "0.75rem", fontSize: "1.1rem" }}>เลือกสินค้า</h2>

          {loading ? (
            <p>กำลังโหลดข้อมูลสินค้า...</p>
          ) : products.length === 0 ? (
            <p>ยังไม่มีสินค้าในระบบ กรุณาเพิ่มสินค้าที่หน้าแรกก่อน</p>
          ) : (
            <form onSubmit={handleAddToCart}>
              <div className="form-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="">-- กรุณาเลือกสินค้า --</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({Number(product.price).toFixed(2)} บาท/{product.unit}) — คงเหลือ {product.stock}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <input
                  type="number"
                  min="1"
                  placeholder="จำนวน"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={{ width: "120px" }}
                />
                <button type="submit">เพิ่มลงตะกร้า</button>
              </div>

              {selectedProduct && (
                <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                  ราคา {Number(selectedProduct.price).toFixed(2)} บาท/{selectedProduct.unit} · คงเหลือ{" "}
                  {selectedProduct.stock} {selectedProduct.unit}
                </p>
              )}
            </form>
          )}

          {/* ปุ่มลัดสินค้าขายดี/ทั้งหมด แบบปุ่มใหญ่ กดง่ายสำหรับหน้าร้าน */}
          {!loading && products.length > 0 && (
            <div className="pos-quick-grid">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="pos-quick-btn"
                  disabled={product.stock <= 0}
                  onClick={() => {
                    setError("");
                    const existingItem = cart.find((item) => item.productId === product.id);
                    const alreadyInCart = existingItem ? existingItem.quantity : 0;
                    if (alreadyInCart + 1 > product.stock) {
                      setError(`"${product.name}" คงเหลือไม่พอ`);
                      return;
                    }
                    if (existingItem) {
                      setCart((prev) =>
                        prev.map((item) =>
                          item.productId === product.id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                        )
                      );
                    } else {
                      setCart((prev) => [
                        ...prev,
                        {
                          productId: product.id,
                          sku: product.sku,
                          name: product.name,
                          unit: product.unit,
                          price: product.price,
                          stock: product.stock,
                          quantity: 1,
                        },
                      ]);
                    }
                  }}
                >
                  <span className="pos-quick-name">{product.name}</span>
                  <span className="pos-quick-price">{Number(product.price).toFixed(2)} บาท</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ฝั่งขวา: ตะกร้าสินค้า */}
        <div className="card">
          <h2 style={{ marginBottom: "0.75rem", fontSize: "1.1rem" }}>ตะกร้าสินค้า</h2>

          {cart.length === 0 ? (
            <p style={{ color: "#6b7280" }}>ยังไม่มีสินค้าในตะกร้า เลือกสินค้าจากฝั่งซ้ายเพื่อเพิ่ม</p>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>สินค้า</th>
                    <th>จำนวน</th>
                    <th>รวม</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.productId}>
                      <td>
                        {item.name}
                        <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                          {Number(item.price).toFixed(2)} บาท/{item.unit}
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) =>
                            handleChangeCartQuantity(item.productId, e.target.value)
                          }
                          style={{ width: "70px" }}
                        />
                      </td>
                      <td>{(item.price * item.quantity).toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.productId)}
                          style={{ backgroundColor: "#dc2626" }}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="button"
                onClick={handleConfirmSale}
                disabled={selling}
                className="pos-confirm-btn"
              >
                {selling ? "กำลังบันทึก..." : `ยืนยันการขาย (${cartTotal.toFixed(2)} บาท)`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
