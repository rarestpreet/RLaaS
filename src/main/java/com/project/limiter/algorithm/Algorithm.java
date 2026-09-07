package com.project.limiter.algorithm;

import com.project.limiter.config.AlgorithmConfig;
import com.project.limiter.dto.response.Decision;

public sealed interface Algorithm permits AnchoredWindowAlgorithm, TokenBucketAlgorithm{

    Decision resolveRequest(String bucketKey, AlgorithmConfig config);

}
