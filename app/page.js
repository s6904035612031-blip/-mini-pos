"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    sku: "",
    name: "",
    price: "",
    stock: "",
    unit: "",
  });
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError("โหลดข้อมูลสินค้าไม่สำเร็จ: " + error.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    if (!form.sku || !form.name || !form.price || !form.stock || !form.unit) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    setSaving(true);
    setError("");

    const { error } = await supabase.from("products").insert([
      {
        sku: form.sku,
        name: form.name,
        price: parseFloat(form.price),
        stock: parseInt(form.stock, 10),
        unit: form.unit,
      },
    ]);

    if (error) {
      setError("เพิ่มสินค้าไม่สำเร็จ: " + error.message);
    } else {
      setForm({ sku: "", name: "", price: "", stock: "", unit: "" });
      fetchProducts();
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm("ต้องการลบสินค้านี้ใช่หรือไม่?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      setError("ลบสินค้าไม่สำเร็จ: " + error.message);
    } else {
      fetchProducts();
    }
  }

  function startEdit(product) {
    setEditingId(product.id);
    setEditForm({
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSaveEdit(id) {
    setError("");
    const { error } = await supabase
      .from("products")
      .update({
        sku: editForm.sku,
        name: editForm.name,
        price: parseFloat(editForm.price),
        stock: parseInt(editForm.stock, 10),
        unit: editForm.unit,
      })
      .eq("id", id);

    if (error) {
      setError("บันทึกการแก้ไขไม่สำเร็จ: " + error.message);
    } else {
      setEditingId(null);
      setEditForm({});
      fetchProducts();
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>รายการสินค้า</h1>

      {error && <p className="error" style={{ marginBottom: "1rem" }}>{error}</p>}

      <div className="card">
        <h2 style={{ marginBottom: "0.75rem", fontSize: "1.1rem" }}>เพิ่มสินค้าใหม่</h2>
        <form onSubmit={handleAddProduct}>
          <div className="form-row">
            <input
              type="text"
              name="sku"
              placeholder="SKU"
              value={form.sku}
              onChange={handleFormChange}
              style={{ width: "120px" }}
            />
            <input
              type="text"
              name="name"
              placeholder="ชื่อสินค้า"
              value={form.name}
              onChange={handleFormChange}
              style={{ width: "200px" }}
            />
            <input
              type="number"
              name="price"
              placeholder="ราคา"
              value={form.price}
              onChange={handleFormChange}
              step="0.01"
              style={{ width: "100px" }}
            />
            <input
              type="number"
              name="stock"
              placeholder="คงเหลือ"
              value={form.stock}
              onChange={handleFormChange}
              style={{ width: "100px" }}
            />
            <input
              type="text"
              name="unit"
              placeholder="หน่วย"
              value={form.unit}
              onChange={handleFormChange}
              style={{ width: "100px" }}
            />
            <button type="submit" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "เพิ่มสินค้า"}
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : products.length === 0 ? (
        <p>ยังไม่มีสินค้าในระบบ</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>ชื่อสินค้า</th>
              <th>ราคา</th>
              <th>คงเหลือ</th>
              <th>หน่วย</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                {editingId === product.id ? (
                  <>
                    <td>
                      <input
                        type="text"
                        name="sku"
                        value={editForm.sku}
                        onChange={handleEditChange}
                        style={{ width: "100px" }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        style={{ width: "150px" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        name="price"
                        value={editForm.price}
                        onChange={handleEditChange}
                        step="0.01"
                        style={{ width: "90px" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        name="stock"
                        value={editForm.stock}
                        onChange={handleEditChange}
                        style={{ width: "80px" }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        name="unit"
                        value={editForm.unit}
                        onChange={handleEditChange}
                        style={{ width: "80px" }}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => handleSaveEdit(product.id)}>บันทึก</button>
                        <button onClick={cancelEdit} style={{ backgroundColor: "#9ca3af" }}>
                          ยกเลิก
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{product.sku}</td>
                    <td>{product.name}</td>
                    <td>{Number(product.price).toFixed(2)}</td>
                    <td>{product.stock}</td>
                    <td>{product.unit}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => startEdit(product)}>แก้ไข</button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          style={{ backgroundColor: "#dc2626" }}
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
