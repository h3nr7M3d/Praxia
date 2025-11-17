package com.praxia.api.dto;

public class LoginResponse {
    private boolean success;
    private Integer userId;
    private String message;

    public LoginResponse() {}
    public LoginResponse(boolean success, Integer userId, String message) {
        this.success = success; this.userId = userId; this.message = message;
    }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}

