package com.afpk.backend.ai;

import java.net.http.HttpClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(GeminiProperties.class)
public class GeminiConfiguration {
    @Bean
    @Qualifier("geminiRestClient")
    RestClient geminiRestClient(RestClient.Builder builder, GeminiProperties properties) {
        var http = HttpClient.newBuilder().connectTimeout(properties.connectTimeout()).build();
        var factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(properties.readTimeout());
        return builder.clone().baseUrl("https://generativelanguage.googleapis.com")
                .requestFactory(factory).build();
    }
}
