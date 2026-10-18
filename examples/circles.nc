%
O1001
; =========================================
; CONTA G-CODE GENERATOR (CGCG) ÇIKTISI
; EDITABLE DRAFT: verify controller, I/O, coordinates, and toolpath before use
; Tarih         : 2026-10-18
; Kontrolcü     : Synthetic generic XY profile
; Desen Tipi    : circle
; Toplam Kapak  : 6 adet
; Tahmini Süre  : ~1 dk 53 sn
; =========================================

; --- PROGRAM SETUP: OPERATOR REVIEW REQUIRED ---
G17 G21 G40 ; XY Düzlemi, Metrik, Telafi İptal
G90 ; Mutlak Programlama Modu
G54 ; İş parçası sıfır noktası seçimi
F1000 ; Tüm çalışma hızları varsayılan
M05 ; Configured process output off
M09 ; Configured coolant off

; --- GEOMETRY 0 ---
; --- DAİRE (Circle) R=50 Izgara 3x2 ---
; --- Kapak [1,1] ---
M05
G00 X200.000
G00 Y200.000
G02 X200.000 Y200.000 I-50.000 J0 F1000.000 ; Tam daire çizimi

; --- Kapak [1,2] ---
M05
G00 X200.000
G00 Y410.000
G02 X200.000 Y410.000 I-50.000 J0 F1000.000 ; Tam daire çizimi

; --- Kapak [2,1] ---
M05
G00 X400.000
G00 Y200.000
G02 X400.000 Y200.000 I-50.000 J0 F1000.000 ; Tam daire çizimi

; --- Kapak [2,2] ---
M05
G00 X400.000
G00 Y410.000
G02 X400.000 Y410.000 I-50.000 J0 F1000.000 ; Tam daire çizimi

; --- Kapak [3,1] ---
M05
G00 X600.000
G00 Y200.000
G02 X600.000 Y200.000 I-50.000 J0 F1000.000 ; Tam daire çizimi

; --- Kapak [3,2] ---
M05
G00 X600.000
G00 Y410.000
G02 X600.000 Y410.000 I-50.000 J0 F1000.000 ; Tam daire çizimi

; --- PROGRAM FINISH ---
M05

; --- PROGRAM SONLANDIRMA ---
M30 ; Configured program end; controller behavior requires verification
% ; Program sonu