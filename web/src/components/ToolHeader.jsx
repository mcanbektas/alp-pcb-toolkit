// Araç başlığı — 26 ekranda birebir aynı üç satırın tek kopyası. Metinler
// ekrana özgüdür ve prop olarak gelir; bileşen dil bilmez.
export default function ToolHeader({ title, intro }) {
  return (
    <div className="tool-header">
      <h1>{title}</h1>
      <p>{intro}</p>
    </div>
  )
}
