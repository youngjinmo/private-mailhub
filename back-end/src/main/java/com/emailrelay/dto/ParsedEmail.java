package com.emailrelay.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedEmail {

    private String messageId;
    private String from;
    private List<String> to;
    private List<String> cc;
    private String subject;
    private String textBody;
    private String htmlBody;
    private String originalRecipient;  // Relay email address
}
