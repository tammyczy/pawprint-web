export default function Icon({icon, size = 20}) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {icon.map(([tag, attributes], index) => {
      const Element = tag;
      return <Element key={index} {...attributes} />;
    })}
  </svg>;
}
