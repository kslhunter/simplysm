// request/response payload가 이 사이즈를 넘으면 split 사용 (바이트)
export const SD_SERVICE_MAX_MESSAGE_SIZE = 3 * 1024 * 1024; // 3MB

// split 전송 시 각 조각 크기 (바이트)
export const SD_SERVICE_SPLIT_CHUNK_SIZE = 300 * 1024; // 300KB
