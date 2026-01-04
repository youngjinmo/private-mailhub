package com.emailrelay.controller;

import com.emailrelay.service.AuthService;
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
    private final AuthService authService;

    /**
     * Check if username exists
     */
    @GetMapping("/exists/{username}")
    public ResponseEntity<Boolean> checkUsernameExists(@PathVariable String username) {
        boolean exists = userService.existsByUsername(username);

        return ResponseEntity.ok(exists);
    }

    /**
     * 회원가입/로그인을 위한 인증코드 발송
     * @param username
     * @return
     */
    @PostMapping("/send-verification-code")
    public ResponseEntity<Void> sendVerificationCode(@RequestParam String username) {
        authService.sendVerificationCode(username);
        return ResponseEntity.ok().build();
    }

    /**
     * 인증코드 유효성 검증
     * @param username
     * @param code
     * @return
     */
    @PostMapping("/verify-code")
    public ResponseEntity<Boolean> verifyCode(@RequestParam String username, @RequestParam String code) {
        if (!userService.existsByUsername(username)) {
           userService.createEmailUser(username);
        }
        Boolean result = authService.verifyCode(username, code);
        return ResponseEntity.ok(result);
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
}
