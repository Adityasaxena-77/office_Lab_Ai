export default function Toggle({ options, value, onChange }) {
  return (
    <div className="toggle" role="group">
      {options.map(([val, label]) => (
        <button key={val} className={val === value ? "on" : ""} onClick={() => onChange(val)}>{label}</button>
      ))}
    </div>
  );
}
