namespace backend.Enums;

public enum MaintenanceCategory
{
    Undefined = 0,
    Elevator = 1,       // Elevador
    FireSafety = 2,     // Extintores, hidrantes, AVCB
    WaterTank = 3,      // Caixa d'água, reservatórios
    PestControl = 4,    // Dedetização, desratização
    Electrical = 5,     // Para-raios (SPDA), quadros, iluminação
    Equipment = 6,      // Gerador, bombas, portões
    Structure = 7,      // Fachada, telhado, impermeabilização
    Pool = 8,           // Piscina
    Other = 9
}
