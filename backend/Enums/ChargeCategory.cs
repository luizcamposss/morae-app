namespace backend.Enums;

// What a charge is for. Shown to the payer and used to filter and group the condominium's income.
public enum ChargeCategory
{
    CondominiumFee = 1,  // Taxa de condomínio
    Rent = 2,            // Aluguel
    Water = 3,           // Água
    Electricity = 4,     // Luz
    Gas = 5,             // Gás
    Apportionment = 6,   // Rateio
    Fine = 7,            // Multa
    Reservation = 8,     // Reserva
    Agreement = 9,       // Acordo
    Other = 10           // Outros
}
