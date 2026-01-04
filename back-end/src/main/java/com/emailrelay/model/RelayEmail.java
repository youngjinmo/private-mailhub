package com.emailrelay.model;

import jakarta.persistence.*;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "relay_emails", indexes = {
    @Index(name = "idx_user_id", columnList = "user_id"),
    @Index(name = "idx_relay_address", columnList = "relay_address"),
    @Index(name = "idx_primary_email", columnList = "primary_email")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RelayEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @JoinColumn(nullable = false)
    private String primaryEmail;

    @Column(nullable = false)
    private String relayAddress;

    @Column
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private Long forwardCount = 0L;

    @Column
    private LocalDateTime lastForwardedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column
    private LocalDateTime deletedAt;
}
