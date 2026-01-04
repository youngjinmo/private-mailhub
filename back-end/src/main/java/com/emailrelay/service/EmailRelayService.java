package com.emailrelay.service;

import com.emailrelay.exception.CustomException.*;
import com.emailrelay.model.RelayEmail;
import com.emailrelay.repository.RelayEmailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailRelayService {

    @Value("${spring.application.domain}")
    private String serviceDomain;

    @Value("${spring.application.name}")
    private String serviceName;

    private final CacheService cacheService;
    private final RelayEmailRepository relayEmailRepository;

    @Transactional
    public String generateRelayEmailAddress(String primaryEmail) {
        String relayAddress;

        do {
            relayAddress = "hello" + serviceDomain;
        } while (relayEmailRepository.findByRelayAddress(relayAddress).isPresent());

        if (relayAddress.isBlank()) {
            throw new GenerateRelayEmailException();
        }

        log.info("Relay email address generated: {}", relayAddress);
        cacheService.setRelayEmail(primaryEmail, relayAddress);
        return relayAddress;
    }

    public String findPrimaryEmailByRelayEmail(String relayEmail) {
        RelayEmail entity = relayEmailRepository
                .findByRelayAddress(relayEmail)
                .orElseThrow();
        return entity.getPrimaryEmail();
    }

    public void forwardEmail(String relayEmail) {
        String primaryEmail = findPrimaryEmailByRelayEmail(relayEmail);
    }
}
