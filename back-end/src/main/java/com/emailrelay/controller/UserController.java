package com.emailrelay.controller;

import com.emailrelay.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Check if username exists
     */
    @GetMapping("/exists/{username}")
    public ResponseEntity<Boolean> checkUsernameExists(@PathVariable String username) {
        boolean exists = userService.existsByUsername(username);

        return ResponseEntity.ok(exists);
    }

    /**
     * Delete current user account (withdrawal)
     */
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteUser(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        userService.deleteUser(userId);

        log.info("User deleted: {}", userId);

        return ResponseEntity.ok().build();
    }

    /**
     * Delete user by ID (admin only)
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long userId) {
        userService.deleteUser(userId);

        log.info("User deleted by admin: {}", userId);

        return ResponseEntity.ok().build();
    }
}
