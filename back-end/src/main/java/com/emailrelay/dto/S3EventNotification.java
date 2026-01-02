package com.emailrelay.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class S3EventNotification {

    @JsonProperty("Records")
    private List<Record> records;

    @Data
    public static class Record {

        @JsonProperty("eventVersion")
        private String eventVersion;

        @JsonProperty("eventSource")
        private String eventSource;

        @JsonProperty("eventName")
        private String eventName;

        @JsonProperty("eventTime")
        private String eventTime;

        @JsonProperty("s3")
        private S3Entity s3;

        @JsonProperty("ses")
        private SesEntity ses;
    }

    @Data
    public static class S3Entity {

        @JsonProperty("bucket")
        private S3Bucket bucket;

        @JsonProperty("object")
        private S3Object object;
    }

    @Data
    public static class S3Bucket {

        @JsonProperty("name")
        private String name;

        @JsonProperty("arn")
        private String arn;
    }

    @Data
    public static class S3Object {

        @JsonProperty("key")
        private String key;

        @JsonProperty("size")
        private Long size;
    }

    @Data
    public static class SesEntity {

        @JsonProperty("mail")
        private SesMail mail;
    }

    @Data
    public static class SesMail {

        @JsonProperty("messageId")
        private String messageId;

        @JsonProperty("destination")
        private List<String> destination;

        @JsonProperty("source")
        private String source;

        @JsonProperty("timestamp")
        private String timestamp;
    }
}
