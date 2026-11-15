package com.afpk.backend.review;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record PlanChatRequest(
    @NotNull @Valid PlanReviewRequest plan,
    @Size(max=12000) String reviewText,
    @NotEmpty @Size(max=11) List<@NotNull @Valid Message> messages) {
  public record Message(@NotNull @Pattern(regexp="user|assistant") String role,
      @NotBlank @Size(max=4000) String text) {}
}
