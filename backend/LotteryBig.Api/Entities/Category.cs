using System.ComponentModel.DataAnnotations;

namespace LotteryBig.Api.Entities;

public class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(80)]
    public string Name { get; set; } = "";

    public int SortOrder { get; set; }

    public ICollection<Game> Games { get; set; } = new List<Game>();
}
