CREATE TABLE TURNO_RECORDATORIO (
    id BIGINT NOT NULL AUTO_INCREMENT,
    id_turno INT NOT NULL,
    offset_minutos INT NOT NULL,
    enviado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_turno_offset (id_turno, offset_minutos),
    CONSTRAINT fk_recordatorio_turno FOREIGN KEY (id_turno) REFERENCES TURNO (id_turno) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX idx_recordatorio_enviado ON TURNO_RECORDATORIO (id_turno, enviado_at);
