using System.Runtime.ExceptionServices;
using backend.Exceptions;

namespace backend.Middlewares;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // The client gave up on the request; nothing to answer and nothing went wrong.
        }
        catch (Exception exception)
        {
            await HandleExceptionAsync(context, exception);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        if (context.Response.HasStarted)
        {
            _logger.LogError(exception, "Unhandled exception after the response started ({Path}).", context.Request.Path);
            ExceptionDispatchInfo.Capture(exception).Throw();
        }

        context.Response.ContentType = "application/json";

        // Expected errors (validation, permission, not found) carry messages written for the user.
        if (exception is ApiException apiException)
        {
            context.Response.StatusCode = apiException.StatusCode;

            await context.Response.WriteAsJsonAsync(new
            {
                statusCode = apiException.StatusCode,
                message = apiException.Message
            });
            return;
        }

        // Unexpected errors: technical details stay in the log, tagged with a short code the user
        // can report; the response reveals nothing about the internals.
        var errorCode = Guid.NewGuid().ToString("N")[..8];

        _logger.LogError(
            exception,
            "Unhandled exception {ErrorCode} on {Method} {Path}",
            errorCode,
            context.Request.Method,
            context.Request.Path);

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;

        await context.Response.WriteAsJsonAsync(new
        {
            statusCode = StatusCodes.Status500InternalServerError,
            message = $"Ocorreu um erro inesperado. Tente novamente. Código: {errorCode}",
            errorCode
        });
    }
}
