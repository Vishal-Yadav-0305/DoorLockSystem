#include <Servo.h>
#include <LiquidCrystal_I2C.h>
#include <Keypad.h>
#include <Password.h>

#define buzzer 11

Servo servo;
LiquidCrystal_I2C lcd(0x27, 16, 2);

Password password = Password("6260"); // Set your desired password

String newPasswordString;
char newPassword[6];
byte a = 5;
bool doorOpen = false;
byte currentPasswordLength = 0;
byte maxPasswordLength = 4;
int wrongAttempts = 0;
bool puzzleMode = false;
int correctAnswer = 0;

const byte ROWS = 4;
const byte COLS = 4;

char keys[ROWS][COLS] = {
  {'D', 'C', 'B', 'A'},
  {'#', '9', '6', '3'},
  {'0', '8', '5', '2'},
  {'*', '7', '4', '1'},
};

byte rowPins[ROWS] = {2, 3, 4, 5};
byte colPins[COLS] = {6, 7, 8, 9};

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

void setup() {
  Serial.begin(9600);
  pinMode(buzzer, OUTPUT);
  servo.attach(10);
  servo.write(0); // Locked position
  lcd.init();
  lcd.backlight();
  lcd.setCursor(3, 0);
  lcd.print("WELCOME TO");
  lcd.setCursor(0, 1);
  lcd.print("DOOR LOCK SYSTEM");
  delay(3000);
  lcd.clear();
}

void loop() {
  if (puzzleMode) {
    handlePuzzle();
    return;
  }

  lcd.setCursor(0, 0);
  lcd.print("ENTER PASSWORD:");

  char key = keypad.getKey();
  if (key != NO_KEY) {
    delay(60);
    if (key == 'C') {
      resetPassword();
    } else {
      lcd.setCursor(a, 1);
      lcd.print("*");
      a++;
      if (a == 11) a = 5;

      password.append(key);
      currentPasswordLength++;

      if (currentPasswordLength == maxPasswordLength) {
        checkPassword();
      }
    }
  }
}

void checkPassword() {
  if (password.evaluate()) {
    // Correct password
    digitalWrite(buzzer, HIGH);
    delay(100);
    digitalWrite(buzzer, LOW);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("CORRECT PASSWORD");
    lcd.setCursor(0, 1);
    lcd.print("DOOR OPENED");
    servo.write(90); // Rotate to 90°
    delay(3000); // Door open duration
    servo.write(0); // Auto-lock
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("AUTO LOCKED");
    delay(2000);
    wrongAttempts = 0;
  } else {
    wrongAttempts++;
    digitalWrite(buzzer, HIGH);
    delay(200);
    digitalWrite(buzzer, LOW);
    delay(200);
    digitalWrite(buzzer, HIGH);
    delay(200);
    digitalWrite(buzzer, LOW);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WRONG PASSWORD!");
    lcd.setCursor(0, 1);
    lcd.print("TRY AGAIN");
    delay(2000);

    if (wrongAttempts >= 3) {
      puzzleMode = true;
      generatePuzzle();
    }
  }
  resetPassword();
}

void resetPassword() {
  password.reset();
  currentPasswordLength = 0;
  lcd.clear();
  a = 5;
}

void generatePuzzle() {
  lcd.clear();
  int num1 = random(1, 10);
  int num2 = random(1, 10);
  bool isAddition = random(0, 2); // 0 or 1

  if (isAddition) {
    correctAnswer = num1 + num2;
    lcd.setCursor(0, 0);
    lcd.print("Solve: ");
    lcd.print(num1);
    lcd.print(" + ");
    lcd.print(num2);
  } else {
    correctAnswer = num1 * num2;
    lcd.setCursor(0, 0);
    lcd.print("Solve: ");
    lcd.print(num1);
    lcd.print(" * ");
    lcd.print(num2);
  }

  lcd.setCursor(0, 1);
  lcd.print("Ans on Keypad:");
}

String answerInput = "";

void handlePuzzle() {
  char key = keypad.getKey();
  if (key != NO_KEY) {
    if (key >= '0' && key <= '9') {
      answerInput += key;
      lcd.setCursor(answerInput.length(), 1);
      lcd.print("*");
    } else if (key == '#') {
      int userAnswer = answerInput.toInt();
      lcd.clear();
      if (userAnswer == correctAnswer) {
        lcd.print("Correct! Proceed");
        wrongAttempts = 0;
        puzzleMode = false;
      } else {
        lcd.print("Wrong Answer!");
        delay(2000);
        lcd.clear();
        generatePuzzle(); // Try again
      }
      answerInput = "";
      delay(2000);
      lcd.clear();
    }
  }
}
