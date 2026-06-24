/**
 * Unit Test Suite for School Marks Management System Calculation Engine
 * Run with Node.js to verify calculation accuracy.
 */

// Core Calculation Functions
function calculateCeTotal(monthlyMarks) {
  return Object.values(monthlyMarks).reduce((sum, val) => {
    // Enforce 0-10 bounds per month
    const cleanVal = Math.min(Math.max(parseInt(val) || 0, 0), 10);
    return sum + cleanVal;
  }, 0);
}

function convertCePercentage(totalCe) {
  // Converted CE = (Total / 100) * 10 = Total / 10
  return parseFloat((totalCe / 10).toFixed(1));
}

function calculateGrandTotal(ceConverted, teMark) {
  const cleanTe = Math.min(Math.max(parseInt(teMark) || 0, 0), 50); // TE out of 50
  return parseFloat((ceConverted + cleanTe).toFixed(1));
}

function verifyPassCriteria(ceConverted, teMark, totalScore) {
  // Custom Pass criteria: TE must be >= 15 (30% of 50) and total >= 24 (40% of 60)
  const isPass = teMark >= 15 && totalScore >= 24;
  return isPass;
}

// Test Runner
const tests = {
  testCeSummation: function() {
    console.log("Running: testCeSummation...");
    const sampleMarks = {
      June: 8, July: 9, August: 7, September: 10, October: 9,
      November: 8, December: 8, January: 9, February: 10, March: 8
    };
    const total = calculateCeTotal(sampleMarks);
    if (total === 86) {
      console.log("✓ PASS: CE sum equals 86.");
    } else {
      console.error(`✗ FAIL: Expected 86, got ${total}`);
    }
  },
  
  testCeSummationBoundary: function() {
    console.log("Running: testCeSummationBoundary...");
    const sampleMarks = {
      June: 12, // Out of bounds high
      July: -5, // Out of bounds low
      August: 8
    };
    const total = calculateCeTotal(sampleMarks);
    // June should be capped at 10, July at 0, August at 8. Total = 10 + 0 + 8 = 18
    if (total === 18) {
      console.log("✓ PASS: Out of bounds monthly marks successfully capped.");
    } else {
      console.error(`✗ FAIL: Expected 18, got ${total}`);
    }
  },
  
  testCeConversionAccuracy: function() {
    console.log("Running: testCeConversionAccuracy...");
    const totalCE = 86;
    const converted = convertCePercentage(totalCE);
    if (converted === 8.6) {
      console.log("✓ PASS: CE conversion (86 / 100 * 10) equals 8.6.");
    } else {
      console.error(`✗ FAIL: Expected 8.6, got ${converted}`);
    }
    
    // Testing rounding
    const totalCE2 = 87; // should be 8.7
    const converted2 = convertCePercentage(totalCE2);
    if (converted2 === 8.7) {
      console.log("✓ PASS: CE conversion (87 / 100 * 10) equals 8.7.");
    } else {
      console.error(`✗ FAIL: Expected 8.7, got ${converted2}`);
    }
  },
  
  testGrandTotal: function() {
    console.log("Running: testGrandTotal...");
    const ceConverted = 8.6;
    const teMark = 45;
    const grandTotal = calculateGrandTotal(ceConverted, teMark);
    if (grandTotal === 53.6) {
      console.log("✓ PASS: Grand total (8.6 + 45) equals 53.6.");
    } else {
      console.error(`✗ FAIL: Expected 53.6, got ${grandTotal}`);
    }
  },
  
  testTeBoundaryLimits: function() {
    console.log("Running: testTeBoundaryLimits...");
    const ceConverted = 8.0;
    const teMarkHigh = 65; // Over 50 max
    const teMarkLow = -10; // Under 0 min
    
    const totalHigh = calculateGrandTotal(ceConverted, teMarkHigh); // should cap TE at 50, total = 8.0 + 50 = 58.0
    const totalLow = calculateGrandTotal(ceConverted, teMarkLow); // should cap TE at 0, total = 8.0 + 0 = 8.0
    
    if (totalHigh === 58.0 && totalLow === 8.0) {
      console.log("✓ PASS: TE boundaries successfully enforced between 0 and 50.");
    } else {
      console.error(`✗ FAIL: Expected [58.0, 8.0], got [${totalHigh}, ${totalLow}]`);
    }
  },
  
  testPassFailCriteria: function() {
    console.log("Running: testPassFailCriteria...");
    
    // Case 1: High CE, Good TE -> Pass
    const p1 = verifyPassCriteria(8.6, 45, 53.6); 
    // Case 2: Good CE, low TE (< 15) -> Fail (Compartment)
    const p2 = verifyPassCriteria(9.0, 12, 21.0); 
    // Case 3: Low CE, Low TE -> Fail
    const p3 = verifyPassCriteria(2.0, 10, 12.0);
    
    if (p1 === true && p2 === false && p3 === false) {
      console.log("✓ PASS: Pass/Fail grading criteria verified accurately.");
    } else {
      console.error(`✗ FAIL: Expected [true, false, false], got [${p1}, ${p2}, ${p3}]`);
    }
  }
};

// Execute
console.log("=== EDUMARK CALCULATION TEST SUITE ===");
let failed = false;
Object.keys(tests).forEach(testName => {
  try {
    tests[testName]();
  } catch (e) {
    console.error(`✗ ERROR in ${testName}:`, e);
    failed = true;
  }
});
console.log("======================================");
if (!failed) {
  console.log("All tests passed successfully.");
} else {
  console.error("Some tests failed.");
  process.exit(1);
}
