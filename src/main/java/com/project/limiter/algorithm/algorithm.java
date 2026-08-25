package com.project.limiter.algorithm;

import com.project.limiter.config.AlgorithmConfig;

public sealed interface Algorithm permits AnchoredWindowAlgorithm, TokenBucketAlgorithm{

    Decision resolveRequest(String bucketKey, AlgorithmConfig config);

}
