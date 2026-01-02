package com.emailrelay.repository;

import com.emailrelay.model.RelayEmail;
import com.emailrelay.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RelayEmailRepository extends JpaRepository<RelayEmail, UUID> {

    Optional<RelayEmail> findByRelayEmail(String relayEmail);

    List<RelayEmail> findByUserAndDeletedAtIsNull(User user);

    Optional<RelayEmail> findByRelayAddressAndDeletedAtIsNull(String relayAddress);

    Optional<RelayEmail> findByIdAndUserAndDeletedAtIsNull(UUID id, User user);

    long countByUserAndDeletedAtIsNull(User user);

    boolean existsByRelayAddress(String relayAddress);

    @Query("SELECT r FROM RelayEmail r WHERE r.scheduledDisableAt IS NOT NULL " +
           "AND r.scheduledDisableAt <= :now AND r.forwardingEnabled = true " +
           "AND r.deletedAt IS NULL")
    List<RelayEmail> findScheduledToDisable(LocalDateTime now);
}
