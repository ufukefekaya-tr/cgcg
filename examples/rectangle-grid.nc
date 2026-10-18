%
O1001
; =========================================
; CONTA G-CODE GENERATOR (CGCG) ÇIKTISI
; EDITABLE DRAFT: verify controller, I/O, coordinates, and toolpath before use
; Tarih         : 2026-10-18
; Kontrolcü     : Synthetic generic XY profile
; Desen Tipi    : rectangleGrid
; Toplam Kapak  : 9 adet
; Tahmini Süre  : ~6 dk 7 sn
; =========================================

; --- PROGRAM SETUP: OPERATOR REVIEW REQUIRED ---
G17 G21 G40 ; XY Düzlemi, Metrik, Telafi İptal
G90 ; Mutlak Programlama Modu
G54 ; İş parçası sıfır noktası seçimi
F1000 ; Tüm çalışma hızları varsayılan
M05 ; Configured process output off
M09 ; Configured coolant off

; --- GEOMETRY 0 ---
; --- RECTANGLE GRID (RectangleGrid) 3x3 ---
; Eksen: X=YATAY(1000mm), Y=DİKEY(1000mm)
; --- Kapak [1,1] ---
M05
G00 X130.000
G00 Y180.000
G00 X330.000 ; Alt kenar çizimi
G00 Y320.000 ; Sağ kenar çizimi
G00 X130.000 ; Üst kenar çizimi
G00 Y180.000 ; Sol kenar çizimi

; --- Kapak [1,2] ---
M05
G00 X130.000
G00 Y380.000
G00 X330.000 ; Alt kenar çizimi
G00 Y520.000 ; Sağ kenar çizimi
G00 X130.000 ; Üst kenar çizimi
G00 Y380.000 ; Sol kenar çizimi

; --- Kapak [1,3] ---
M05
G00 X130.000
G00 Y580.000
G00 X330.000 ; Alt kenar çizimi
G00 Y720.000 ; Sağ kenar çizimi
G00 X130.000 ; Üst kenar çizimi
G00 Y580.000 ; Sol kenar çizimi

; --- Kapak [2,1] ---
M05
G00 X390.000
G00 Y180.000
G00 X590.000 ; Alt kenar çizimi
G00 Y320.000 ; Sağ kenar çizimi
G00 X390.000 ; Üst kenar çizimi
G00 Y180.000 ; Sol kenar çizimi

; --- Kapak [2,2] ---
M05
G00 X390.000
G00 Y380.000
G00 X590.000 ; Alt kenar çizimi
G00 Y520.000 ; Sağ kenar çizimi
G00 X390.000 ; Üst kenar çizimi
G00 Y380.000 ; Sol kenar çizimi

; --- Kapak [2,3] ---
M05
G00 X390.000
G00 Y580.000
G00 X590.000 ; Alt kenar çizimi
G00 Y720.000 ; Sağ kenar çizimi
G00 X390.000 ; Üst kenar çizimi
G00 Y580.000 ; Sol kenar çizimi

; --- Kapak [3,1] ---
M05
G00 X650.000
G00 Y180.000
G00 X850.000 ; Alt kenar çizimi
G00 Y320.000 ; Sağ kenar çizimi
G00 X650.000 ; Üst kenar çizimi
G00 Y180.000 ; Sol kenar çizimi

; --- Kapak [3,2] ---
M05
G00 X650.000
G00 Y380.000
G00 X850.000 ; Alt kenar çizimi
G00 Y520.000 ; Sağ kenar çizimi
G00 X650.000 ; Üst kenar çizimi
G00 Y380.000 ; Sol kenar çizimi

; --- Kapak [3,3] ---
M05
G00 X650.000
G00 Y580.000
G00 X850.000 ; Alt kenar çizimi
G00 Y720.000 ; Sağ kenar çizimi
G00 X650.000 ; Üst kenar çizimi
G00 Y580.000 ; Sol kenar çizimi

; --- PROGRAM FINISH ---
M05

; --- PROGRAM SONLANDIRMA ---
M30 ; Configured program end; controller behavior requires verification
% ; Program sonu