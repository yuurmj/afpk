package com.afpk.backend.scenario;

import com.afpk.backend.ai.GeminiClient;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.json.JsonMapper;

@RestController
public class ScenarioAnalysisController {
    private final ScenarioCalculator calculator;
    private final GeminiClient gemini;
    private final JsonMapper jsonMapper;

    public ScenarioAnalysisController(ScenarioCalculator calculator, GeminiClient gemini, JsonMapper jsonMapper) {
        this.calculator = calculator;
        this.gemini = gemini;
        this.jsonMapper = jsonMapper;
    }

    public record ExplanationResponse(String explanation) {}

    @PostMapping("/api/analyze-scenario")
    public ExplanationResponse analyze(@Valid @RequestBody ScenarioAnalysisRequest request) {
        var verified = calculator.calculate(request);
        return new ExplanationResponse(gemini.explain(jsonMapper.writeValueAsString(verified)));
    }
}
