# PowerShell script to generate Excel CSV databases for the School Marks Management System
# Generates students_database.csv (558 rows of marks) and teachers_database.csv (10 teachers)

$subjects = @("Arabic", "English", "Quran", "Malayalam", "Mathematics", "Science")
$classes = @(
    @{ Name = "Class 1"; Count = 16 },
    @{ Name = "Class 2"; Count = 8 },
    @{ Name = "Class 3"; Count = 11 },
    @{ Name = "Class 4"; Count = 11 },
    @{ Name = "Class 5"; Count = 14 },
    @{ Name = "Class 6"; Count = 11 },
    @{ Name = "Class 7"; Count = 11 },
    @{ Name = "Class 8"; Count = 11 }
)

$firstNames = @("Ahmad", "Fatima", "Zayd", "Maryam", "Omar", "Khadija", "Yusuf", "Aisha", "Bilal", "Safiya", "Hamza", "Zainab", "Ali", "Hana", "Ibrahim", "Sara", "Mustafa", "Ruqayya", "Yahya", "Hajar", "Sufyan", "Sumayya", "Anas", "Asma", "Imran", "Nour", "Tariq", "Layla", "Khalid", "Huda")
$lastNames = @("Khan", "Ali", "Syed", "Hassan", "Ahmed", "Rahman", "Malik", "Sheikh", "Farook", "Abdullah", "Shaikh", "Patel", "Hussein", "Qureshi", "Begum")

# 1. Generate Students Database CSV
$studentRows = @()
# Add BOM for Excel UTF-8 compatibility
$studentRows += "Student ID,Name,Class,Subject,June,July,August,September,October,November,December,January,February,March,CE Total,CE Converted,TE,Grand Total,Status"

$globalId = 1
foreach ($cls in $classes) {
    for ($i = 0; $i -lt $cls.Count; $i++) {
        $studentId = "ST" + $globalId.ToString().PadLeft(3, '0')
        $fName = $firstNames[(Get-Random -Maximum $firstNames.Length)]
        $lName = $lastNames[(Get-Random -Maximum $lastNames.Length)]
        $name = "$fName $lName"
        $className = $cls.Name
        
        foreach ($sub in $subjects) {
            $ceTotal = 0
            $monthly = @()
            
            # Generate 10 months of CE marks (7 to 10)
            for ($m = 0; $m -lt 10; $m++) {
                $mark = Get-Random -Minimum 7 -Maximum 11 # 7, 8, 9, or 10
                $monthly += $mark
                $ceTotal += $mark
            }
            
            $ceConverted = [Math]::Round(($ceTotal / 10), 1)
            $te = Get-Random -Minimum 30 -Maximum 49 # 30 to 48
            $grandTotal = $ceConverted + $te
            
            # Pass/Fail status
            $status = "PASS"
            if ($te -lt 15 -or $grandTotal -lt 24) {
                $status = "FAIL"
            }
            
            $row = "$studentId,$name,$className,$sub," + ($monthly -join ",") + ",$ceTotal,$ceConverted,$te,$grandTotal,$status"
            $studentRows += $row
        }
        $globalId++
    }
}

$studentRows | Out-File -FilePath "students_database.csv" -Encoding utf8

# 2. Generate Teachers Database CSV
$teacherRows = @()
$teacherRows += "Teacher ID,Name,Email,Assigned Classes,Assigned Subjects"

$teachersData = @(
    @{ id = "teacher001"; name = "Sarah Ahmed"; email = "teacher1@school.com"; classes = "Class 1|Class 2|Class 5"; subjects = "Arabic|Quran" },
    @{ id = "teacher002"; name = "John Doe"; email = "teacher2@school.com"; classes = "Class 3|Class 4"; subjects = "English|Malayalam" },
    @{ id = "teacher003"; name = "David Miller"; email = "teacher3@school.com"; classes = "Class 5|Class 6"; subjects = "Mathematics|Science" },
    @{ id = "teacher004"; name = "Emily Davis"; email = "teacher4@school.com"; classes = "Class 1|Class 3"; subjects = "English" },
    @{ id = "teacher005"; name = "Mohammed Al-Fatih"; email = "teacher5@school.com"; classes = "Class 2|Class 4"; subjects = "Arabic" },
    @{ id = "teacher006"; name = "Fatima Hassan"; email = "teacher6@school.com"; classes = "Class 7|Class 8"; subjects = "Quran|Arabic" },
    @{ id = "teacher007"; name = "Aisha Rehman"; email = "teacher7@school.com"; classes = "Class 7|Class 8"; subjects = "English|Malayalam" },
    @{ id = "teacher008"; name = "Robert Chen"; email = "teacher8@school.com"; classes = "Class 6|Class 7"; subjects = "Mathematics" },
    @{ id = "teacher009"; name = "Elena Rostova"; email = "teacher9@school.com"; classes = "Class 5|Class 8"; subjects = "Science" },
    @{ id = "teacher010"; name = "Ravi Kumar"; email = "teacher10@school.com"; classes = "Class 1|Class 2|Class 3"; subjects = "Malayalam" }
)

foreach ($t in $teachersData) {
    $row = "$($t.id),$($t.name),$($t.email),$($t.classes),$($t.subjects)"
    $teacherRows += $row
}

$teacherRows | Out-File -FilePath "teachers_database.csv" -Encoding utf8

Write-Output "Excel CSV databases successfully generated!"
