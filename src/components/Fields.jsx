// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0
export function NumberField({label, value, onChange, unit='mm', min=0, step='any', ...props}) {
  return <label className="field"><span>{label}</span><div className="input-unit"><input type="number" value={value ?? ''} min={min} step={step} onChange={event => onChange(event.target.value === '' ? '' : Number(event.target.value))} {...props}/>{unit && <small>{unit}</small>}</div></label>;
}
export function Switch({label, note, checked, onChange}) {
  return <label className="switch-row"><span><strong>{label}</strong>{note && <small>{note}</small>}</span><input type="checkbox" checked={Boolean(checked)} onChange={event => onChange(event.target.checked)}/><i aria-hidden="true"/></label>;
}
export function SectionTitle({children,aside}) {
  return <div className="form-section-heading"><h3>{children}</h3>{aside}</div>;
}
