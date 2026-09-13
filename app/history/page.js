"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function HistoryPage() {
  // รายการประวัติการขายทั้งหมด
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // โหลดข้อมูลเมื่อ mount
  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("sold_at", { ascending: false });

    if (error) {
      setError("โหลดข้อมูลประวัติการขายไม่สำเร็จ: " + error.message);
    } else {
      setSales(data || []);
    }
    setLoading(false);
  }

  // คำนวณยอดขายรวมทั้งหมด
  const totalRevenue = sales.reduce(
    (sum, sale) => sum + Number(sale.total_price || 0),
    0
  );

  // จัดรูปแบบวันเวลาให้อ่านง่าย
  function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>ประวัติการขาย</h1>

      {error && (
        <p className="error" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {/* สรุปยอดขายรวมทั้งหมด */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "1rem", color: "#6b7280" }}>
          ยอดขายรวมทั้งหมด
        </span>
        <span style={{ fontSize: "1.4rem", fontWeight: "700", color: "#2563eb" }}>
          {totalRevenue.toFixed(2)} บาท
        </span>
      </div>

      {/* ตารางประวัติการขาย */}
      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : sales.length === 0 ? (
        <p>ยังไม่มีประวัติการขาย</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>วันเวลาที่ขาย</th>
              <th>ชื่อสินค้า</th>
              <th>จำนวน</th>
              <th>ยอดรวม</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>{formatDateTime(sale.sold_at)}</td>
                <td>{sale.product_name}</td>
                <td>{sale.quantity}</td>
                <td>{Number(sale.total_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
