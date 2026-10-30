namespace backend.Exceptions;

public class BadRequestException : ApiException
{
    public BadRequestException(string message) 
        : base(message, StatusCodes.Status400BadRequest)
    {
        
    }
}
