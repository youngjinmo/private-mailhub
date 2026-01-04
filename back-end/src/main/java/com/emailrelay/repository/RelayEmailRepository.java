package com.emailrelay.repository;

import com.emailrelay.model.RelayEmail;
import com.emailrelay.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RelayEmailRepository extends JpaRepository<RelayEmail, Long> {

    Optional<RelayEmail> findByRelayAddress(String relayAddress);

    List<RelayEmail> findByUserAndDeletedAtIsNull(User user);

    Optional<RelayEmail> findByRelayAddressAndDeletedAtIsNull(String relayAddress);

    Optional<RelayEmail> findByIdAndUserAndDeletedAtIsNull(Long id, User user);

    long countByUserAndDeletedAtIsNull(User user);

    boolean existsByRelayAddress(String relayAddress);
}
