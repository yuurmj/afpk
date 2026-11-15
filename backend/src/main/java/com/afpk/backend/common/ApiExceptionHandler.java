package com.afpk.backend.common;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    public record ErrorResponse(String code, String message) {}

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorResponse> handleApi(ApiException exception) {
        return ResponseEntity.status(exception.status())
                .body(new ErrorResponse(exception.code(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        String fields = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField()).distinct().sorted()
                .reduce((left, right) -> left + ", " + right).orElse("입력값");
        return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_INPUT",
                "입력값을 확인해 주세요: " + fields
                + ". 금액은 정수 원 단위 0~1조 원(목표금액은 1원 이상), 기간은 1~600개월, "
                + "소득 감소율은 0~100%, 지출 증가율은 0~1000% 범위입니다. 비율은 소수점 4자리까지 입력할 수 있습니다."));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorResponse> handleUnreadable() {
        return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_JSON",
                "요청 형식을 확인해 주세요. 금액과 기간에는 정수, 비율에는 숫자를 입력해 주세요."));
    }
}
