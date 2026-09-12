package com.brr.medi_pcr.Entity;

public enum Role {
    ROLE_USER,
    ROLE_ADMIN;

    public static Role fromString(String roleStr) {
        if (roleStr == null || roleStr.trim().isEmpty()) {
            return ROLE_USER;
        }
        String clean = roleStr.trim().toUpperCase();
        if (clean.equals("ADMIN") || clean.equals("ROLE_ADMIN")) {
            return ROLE_ADMIN;
        }
        return ROLE_USER;
    }

    public String getRoleNameWithoutPrefix() {
        return name().startsWith("ROLE_") ? name().substring(5) : name();
    }
}
