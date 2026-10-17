import { useEffect, useState } from "react";
import { getUnitsByBuilding } from "../units/unitService";
import type { UnitResponse } from "../units/types";

// Units of one building (empty while loading or when no building is chosen).
export function useBuildingUnits(buildingId: string) {
  const [loaded, setLoaded] = useState<{ buildingId: string; units: UnitResponse[] }>({ buildingId: "", units: [] });

  useEffect(() => {
    if (!buildingId) return;
    let isMounted = true;

    getUnitsByBuilding(Number(buildingId))
      .then((units) => {
        if (!isMounted) return;
        const sorted = [...units].sort((a, b) => a.number.localeCompare(b.number, "pt-BR", { numeric: true }));
        setLoaded({ buildingId, units: sorted });
      })
      .catch(() => isMounted && setLoaded({ buildingId, units: [] }));

    return () => {
      isMounted = false;
    };
  }, [buildingId]);

  return buildingId && loaded.buildingId === buildingId ? loaded.units : [];
}
