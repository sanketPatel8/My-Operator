export default function WorkflowList() {
  const workflows = [
    { name: "Reminder 1", delay: "1 hour" },
    { name: "Reminder 2", delay: "4 hours" },
    { name: "Reminder 3", delay: "4 hours" },
  ];

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Abandoned Cart Recovery</h2>
      <ul className="space-y-4">
        {workflows.map((flow, idx) => (
          <li
            key={idx}
            className="p-4 bg-white border rounded flex flex-col sm:flex-row items-start sm:items-center justify-between"
          >
            <div>
              <h4 className="font-medium">{flow.name}</h4>
              <p className="text-sm text-gray-500">Send after {flow.delay}</p>
            </div>
            <input type="checkbox" className="toggle toggle-primary mt-2 sm:mt-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}
