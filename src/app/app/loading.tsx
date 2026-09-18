/** Esqueleto mientras carga cualquier pantalla de /app: misma retícula, brillo suave. */
export default function Cargando() {
  return (
    <div className="animate-fade" aria-busy="true" aria-label="Cargando">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="skeleton h-[330px] rounded-card-lg" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="skeleton h-[150px] rounded-card-lg" />
            <div className="skeleton h-[150px] rounded-card-lg" />
            <div className="skeleton hidden h-[150px] rounded-card-lg md:block" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-card" style={{ opacity: 1 - i * 0.15 }} />)}
          </div>
        </div>
        <div className="hidden space-y-5 md:block">
          <div className="skeleton h-12 rounded-card" />
          <div className="skeleton h-[280px] rounded-card-lg" />
        </div>
      </div>
    </div>
  );
}
