package com.emailrelay.service;

import com.emailrelay.exception.CustomException.*;
import com.emailrelay.model.User;
import com.emailrelay.repository.UserRepository;
import com.emailrelay.security.TokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final TokenService tokenService;
    private final AuthService authService;
    private final UserRepository userRepository;


    public boolean existsByUsername(String username) {
        return userRepository.existsByUsernameAndDeletedAtIsNull(username);
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(username));
    }

    public User findById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new UserNotFoundException(id.toString()));
    }

    public String requestCodeForVerifyEmail(String email) {
        if (userRepository.existsByUsernameAndDeletedAtIsNull(email)) {
            throw new UserAlreadyExistsException(email);
        }

        return authService.sendVerificationCode(email);
    }

    public boolean verifyEmailCode(String email, String code) {
        return authService.verifyCode(email, code);
    }

    @Transactional
    public User createEmailUser(String username) {
        // Check if user already exists
        if (userRepository.existsByUsernameAndDeletedAtIsNull(username)) {
            throw new UserAlreadyExistsException(username);
        }

        User user = User.builder()
                .username(username)  // email stored as username
                .subscriptionTier(User.SubscriptionTier.FREE)
                .build();

        User savedUser = userRepository.save(user);
        log.info("Created email user: {}", username);
        return savedUser;
    }

    @Transactional
    public String login(String username) {
        Long userId = userRepository.findByUsername(username).get().getId();
        return tokenService.generateAccessToken(userId, username);
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = findById(userId);
        user.setDeletedAt(LocalDateTime.now());
        userRepository.save(user);
        log.info("Soft deleted user: {}", user.getUsername());
    }
}
