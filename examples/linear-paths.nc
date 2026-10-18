%
O1001
; =========================================
; CONTA G-CODE GENERATOR (CGCG) ÇIKTISI
; EDITABLE DRAFT: verify controller, I/O, coordinates, and toolpath before use
; Tarih         : 2026-10-18
; Kontrolcü     : Synthetic generic XY profile
; Desen Tipi    : linearPath
; Toplam Kapak  : 9 adet
; Tahmini Süre  : ~1 dk 49 sn
; =========================================

; --- PROGRAM SETUP: OPERATOR REVIEW REQUIRED ---
G17 G21 G40 ; XY Düzlemi, Metrik, Telafi İptal
G90 ; Mutlak Programlama Modu
G54 ; İş parçası sıfır noktası seçimi
F1000 ; Tüm çalışma hızları varsayılan
M05 ; Configured process output off
M09 ; Configured coolant off

; --- GEOMETRY 0 ---
; --- DOĞRUSAL YOL (Linear Path) Izgara 3x3 ---
; --- Kapak [1,1] ---
M05
G00 X80.000
G00 Y160.000
G00 X260.000 Y250.000 ; Doğrusal döküm çizgisi

; --- Kapak [1,2] ---
M05
G00 X80.000
G00 Y330.000
G00 X260.000 Y420.000 ; Doğrusal döküm çizgisi

; --- Kapak [1,3] ---
M05
G00 X80.000
G00 Y500.000
G00 X260.000 Y590.000 ; Doğrusal döküm çizgisi

; --- Kapak [2,1] ---
M05
G00 X340.000
G00 Y160.000
G00 X520.000 Y250.000 ; Doğrusal döküm çizgisi

; --- Kapak [2,2] ---
M05
G00 X340.000
G00 Y330.000
G00 X520.000 Y420.000 ; Doğrusal döküm çizgisi

; --- Kapak [2,3] ---
M05
G00 X340.000
G00 Y500.000
G00 X520.000 Y590.000 ; Doğrusal döküm çizgisi

; --- Kapak [3,1] ---
M05
G00 X600.000
G00 Y160.000
G00 X780.000 Y250.000 ; Doğrusal döküm çizgisi

; --- Kapak [3,2] ---
M05
G00 X600.000
G00 Y330.000
G00 X780.000 Y420.000 ; Doğrusal döküm çizgisi

; --- Kapak [3,3] ---
M05
G00 X600.000
G00 Y500.000
G00 X780.000 Y590.000 ; Doğrusal döküm çizgisi

; --- PROGRAM FINISH ---
M05

; --- PROGRAM SONLANDIRMA ---
M30 ; Configured program end; controller behavior requires verification
% ; Program sonu