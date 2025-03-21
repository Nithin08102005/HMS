"use client";

import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function MaintenanceTracking() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHostel, setSelectedHostel] = useState(""); // New state for hostel selection

  // For editing a complaint
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [resolutionMessage, setResolutionMessage] = useState("");

  useEffect(() => {
    async function fetchComplaints() {
      try {
        const res = await fetch("/api/admin/maintenance");
        const data = await res.json();
        setComplaints(data);
      } catch (error) {
        console.error("Error fetching maintenance tasks:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchComplaints();
  }, []);

  // Handler for dropdown change
  const handleHostelChange = (e) => {
    setSelectedHostel(e.target.value);
  };

  // Filter complaints based on selected hostel (if any)
  const filteredComplaints = selectedHostel
    ? complaints.filter((comp) => comp.hostel_block === selectedHostel)
    : complaints;

  // Compute summary counts for bar graph from filtered complaints
  const summary = filteredComplaints.reduce(
    (acc, comp) => {
      if (comp.status === "pending") acc.pending++;
      else if (comp.status === "in progress") acc.inProgress++;
      else if (comp.status === "completed") acc.completed++;
      return acc;
    },
    { pending: 0, inProgress: 0, completed: 0 }
  );

  const chartData = {
    labels: ["Pending", "In Progress", "Completed"],
    datasets: [
      {
        label: "Complaints",
        data: [summary.pending, summary.inProgress, summary.completed],
        backgroundColor: ["#FFCE56", "#36A2EB", "#4BC0C0"],
      },
    ],
  };

  // Compute unique hostels from the complaints data (if available)
  const uniqueHostels = Array.from(
    new Set(complaints.map((comp) => comp.hostel_block).filter(Boolean))
  );

  // Edit complaint handler remains unchanged
  const handleEditClick = (complaint) => {
    setEditingComplaint(complaint);
    setNewStatus(complaint.status);
    setResolutionMessage(complaint.resolution_info || "");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingComplaint) return;
    const closedAt = newStatus === "completed" ? new Date().toISOString() : null;
    try {
      const res = await fetch("/api/admin/updateComplaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_id: editingComplaint.complaint_id,
          status: newStatus,
          resolution_info: resolutionMessage,
          closed_at: closedAt,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setComplaints(
          complaints.map((comp) =>
            comp.complaint_id === editingComplaint.complaint_id
              ? { ...comp, status: newStatus, resolution_info: resolutionMessage, closed_at: closedAt }
              : comp
          )
        );
        setEditingComplaint(null);
      } else {
        alert("Error updating complaint: " + result.error);
      }
    } catch (error) {
      console.error("Error updating complaint:", error);
    }
  };

  if (loading) return <div>Loading maintenance tasks...</div>;

  return (
    <div style={{ padding: "2rem", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
      {/* Left Column: Table and Dropdown */}
      <div style={{ width: "80%" }}>
        <h1>Maintenance & Infrastructure Tracking</h1>
        {/* Dropdown to select hostel */}
        <div style={{ marginBottom: "1rem" }}>
          <label>
            Select Hostel:{" "}
            <select value={selectedHostel} onChange={handleHostelChange} style={{ padding: "0.5rem" }}>
              <option value="">All Hostels</option>
              {uniqueHostels.map((hostel) => (
                <option key={hostel} value={hostel}>
                  {hostel}
                </option>
              ))}
            </select> 
          </label>
        </div>
        <table style={tableStyle}>
          <thead style={theadStyle}>
            <tr>
              <th style={thStyle}>Roll No</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Closed At</th>
              <th style={thStyle}>Resolution Info</th>
              <th style={thStyle}>Created At</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredComplaints.map((complaint) => (
              <tr key={complaint.complaint_id} style={trStyle}>
                <td style={tdStyle}>{complaint.roll_no}</td>
                <td style={tdStyle}>{complaint.description}</td>
                <td style={tdStyle}>{complaint.status}</td>
                <td style={tdStyle}>
                  {complaint.closed_at ? new Date(complaint.closed_at).toLocaleString() : "-"}
                </td>
                <td style={tdStyle}>{complaint.resolution_info ? complaint.resolution_info : "-"}</td>
                <td style={tdStyle}>{new Date(complaint.created_at).toLocaleString()}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleEditClick(complaint)} style={buttonStyle}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {editingComplaint && (
          <div style={modalStyle}>
            <h3>Update Complaint #{editingComplaint.complaint_id}</h3>
            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: "1rem" }}>
                <label>
                  Status:{" "}
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label>
                  Resolution Info:{" "}
                  <textarea
                    value={resolutionMessage}
                    onChange={(e) => setResolutionMessage(e.target.value)}
                    placeholder="Enter resolution message or image URL"
                  />
                </label>
              </div>
              <button type="submit" style={buttonStyle}>Update</button>
              <button
                type="button"
                onClick={() => setEditingComplaint(null)}
                style={{ ...buttonStyle, marginLeft: "1rem", backgroundColor: "#aaa" }}
              >
                Cancel
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Right Column: Graph Overview */}
      <div style={{ width: "10%", minWidth: "200px" }}>
        <h2>Complaints Overview</h2>
        <div style={{ height: "300px" }}>
          <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  );
}

// Inline Styles
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const theadStyle = {
  backgroundColor: "#f0f0f0",
};

const thStyle = {
  padding: "0.75rem",
  textAlign: "left",
  borderBottom: "2px solid #ccc",
  fontWeight: "600",
};

const trStyle = {
  borderBottom: "1px solid #ddd",
};

const tdStyle = {
  padding: "0.75rem",
  verticalAlign: "top",
};

const buttonStyle = {
  padding: "0.5rem 1rem",
  backgroundColor: "#1c2f58",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

const modalStyle = {
  border: "1px solid #ccc",
  padding: "1rem",
  maxWidth: "400px",
  marginTop: "1rem",
};
