namespace backend.Enums;

// What kind of property the condominium is. It only picks the modules that start enabled;
// the Admin can turn modules on and off afterwards.
public enum CondominiumType
{
    Residential = 1,
    Rental = 2,
    Mixed = 3
}
