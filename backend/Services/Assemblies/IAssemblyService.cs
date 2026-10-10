using backend.DTOs.Assembly;

namespace backend.Services.Assemblies;

public interface IAssemblyService
{
    Task<AssemblyResponseDto> CreateAsync(int userId, int condominiumId, SaveAssemblyDto dto);
    Task<IEnumerable<AssemblyResponseDto>> GetByCondominiumAsync(int userId, int condominiumId);
    Task<AssemblyResponseDto> GetByIdAsync(int userId, int assemblyId);
    Task<AssemblyResponseDto> UpdateAsync(int userId, int assemblyId, SaveAssemblyDto dto);
    Task DeleteAsync(int userId, int assemblyId);
    Task<AssemblyResponseDto> PublishAsync(int userId, int assemblyId);
    Task<AssemblyResponseDto> CancelAsync(int userId, int assemblyId, CancelAssemblyDto dto);
    Task<MyBallotDto> GetMyBallotAsync(int userId, int assemblyId);
    Task<MyBallotDto> CastVotesAsync(int userId, int assemblyId, CastVotesDto dto);
}
