const attackers = [
  {
    ip: "185.19.100.153",
    score: 92,
    action: "BLOCKED",
  },
  {
    ip: "51.158.169.21",
    score: 81,
    action: "WATCH",
  },
];

export default function AttackerTable() {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <h3>Active Attackers</h3>

      <table
        style={{
          width: "100%",
          marginTop: 20,
        }}
      >
        <thead>
          <tr>
            <th>IP</th>
            <th>Threat</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {attackers.map((a) => (
            <tr key={a.ip}>
              <td>{a.ip}</td>
              <td>{a.score}</td>
              <td>{a.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}