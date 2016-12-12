from PySide import QtGui
from PySide import QtCore

code = []
allCourses = {}
masterPlan = []
allDegrees = []

tab = "&nbsp;&nbsp;&nbsp;&nbsp;"
breaktab = "<br>"+str(tab)

def loadFile():
    global code
    with open('course_data.txt', 'r') as f:
        text = [line.strip() for line in f]
    for i in text:
        if i and "#" not in i:
            code.append(i)
            eval(i)
    
def writeFile(text):
    if text not in code:
        with open('course_data.txt', 'a') as f:
            f.write("\n"+text)

def parseClasses():
    parsedClasses = {}
    for semester in sorted(masterPlan):
        completion = semester.completed
        for course in sorted(semester.courses):
            if completion:
                parsedClasses.update({ semester.courses[course].name : 1 })
            else:
                parsedClasses.update({ semester.courses[course].name : 0 })
    return parsedClasses

def completionRate():
    cntr = 1
    total = 0
    for major in allDegrees:
        total += major.percentage
    return total

def printCourses():
    string = ""
    #string += "<style type='text/css'> p,li {white-space: pre; }</style>"
    string += "INPUTTED CLASSES<br>----------"
    string += "<br>" + ("ABBREVIATION" + " "*30)[:30]
    string += "TITLE<br>"
    for i in sorted(allCourses):
        string += "<br>" + (i + " "*30)[:30] + allCourses[i].name
        print (i + " "*30)[:30] + "h"
    string = string.replace(" ", "&nbsp;")
    return string

def instructionSet():
    string = "VAR NAMES<br>----------"
    for i in masterPlan:
        string += breaktab + i.var
    for i in allDegrees:
        string += breaktab + i.var
    string += "<br><br>To add a class"
    string += breaktab + "addCourse('COURSE_ABBREVIATION','COURSE_TITLE', HOURS)" 
    
    string += "<br><br>To asssign a class to semester"
    string += breaktab + "SEMESTER_VAR_NAME.add('COURSE_ABBREVIATION')"
    string += "<br><br>To assign a class to a major: "
    string += breaktab + "MAJORNAME.setCourse('COURSE_REQUIREMENT', 'COURSE_ABBREVIATION')"

    return string

class Course:
    def __init__(self, name="", hours=3, status=0):
        self.name = str(name)
        self.hours = int(hours)
        self.status = status

def addCourse(abbr, desc, hours=3, status=0):
    allCourses.update({ abbr: Course(desc, hours, status) })
    writeFile("addCourse('"+str(abbr)+"','"+str(desc)+"',"+str(hours)+","+str(status)+")")

class Required:
    def __init__(self, hours=3, satisfy=None):
        self.hours = int(hours)
        self.satisfy = satisfy

    def fulfill(self, course):
        self.satisfy = course
        self.status = 1

class Major:
    def __init__(self, var="", name=""):
        self.var = str(var)
        self.name = str(name)
        self.courses = {}
        self.percentage = 0

    def output(self, data):
        string = self.name
        string += "<br>----------"
        string += breaktab
        self.completed = 0
        self.pending = 0
        self.total = 0
        print self.name
        for course in sorted(self.courses):
            print course
            rec = self.courses[course]
            string += "<br>" + str(rec.hours) +" "+ str(course)
            if rec.satisfy != None: #If course requirement set
                if rec.satisfy.name in data: #If class has/had been scheduled
                    if data[rec.satisfy.name]: #If course already taken
                        self.completed += rec.satisfy.hours
                        string += breaktab + "<font color='green'>" + str(rec.satisfy.name) + "</font>"
                    else: #Planning to take course
                        self.pending += rec.satisfy.hours
                        string += breaktab + "<font color='blue'>" + str(rec.satisfy.name) + "</font>"
                    self.total += rec.satisfy.hours
                else: #Specific requirement not scheduled
                    string += breaktab + "<font color='orange'>" + str(rec.satisfy.name) + "</font>"
                    self.total += rec.hours
            else: #No requirement set
                string += breaktab + "<font color='red'>Incompleted</font>"
                self.total += rec.hours
        string += breaktab
        string += breaktab + "Completed: "+str(int(self.completed))
        string += breaktab + "Pending: "+str(int(self.pending))
        string += breaktab + "Remaining: "+str(int(self.total-self.completed-self.pending))
        self.percentage = int(float(self.completed+self.pending)/float(self.total)*100)
        string += breaktab + "Percent: "+str(self.percentage) + "%"
        string += breaktab

        return string

    def setCourse(self, key, course):
        self.courses[key].satisfy = allCourses[course]
        writeFile(self.var+".setCourse('"+key+"','"+course+"')")
        
    def setReq(self, arr):
        for key in arr:
            if type(key) is str:
                self.courses.update({ key: Required() })
            else:
                self.courses.update({ key[0]: Required(key[1]) })

class Semester:
    def __init__(self, var="", semester="", year=2016, completed=0):
        self.var = str(var)
        self.semester = str(semester)
        self.year = int(year)
        self.completed = completed
        self.courses = {}

    def add(self, course):
        specific = allCourses[course]
        self.courses.update({course: specific})
        writeFile(self.var+".add('"+course+"')")

    def output(self):
        string = self.semester + " "  + str(self.year)
        string += "<br>----------"
        string += "<br>"
        hours = 0
        for course in sorted(self.courses):
            string += "<br><br>" + course +" - "+ self.courses[course].name
            hours += self.courses[course].hours
        string += "<br><br><b>Total hours: " + str(hours) +"</b>"
        return string

    def remove(self, course):
        self.courses.pop(course, None)
        writeFile(self.var+".remove('"+course+"')")

class Interface(QtGui.QWidget):
    def __init__(self):
        super(Interface, self).__init__()

        self.topLvl = QtGui.QVBoxLayout()

        button1 = QtGui.QPushButton("View Master Plan")
        button1.clicked.connect(self.displaySemesters)
        button2 = QtGui.QPushButton("View Degree Progress")
        button2.clicked.connect(self.displayMajors)
        button3 = QtGui.QPushButton("View back-end data")
        button3.clicked.connect(self.displayBack)
        
        self.topLvl.addWidget(button1)
        self.topLvl.addWidget(button2)
        self.topLvl.addWidget(button3)

        self.display = QtGui.QHBoxLayout()
        self.topLvl.addLayout(self.display)

        self.codeInput = QtGui.QLineEdit()
        self.codeInput.setPlaceholderText("Input line of code here")
        self.codeInput.returnPressed.connect(self.addCode)

        self.topLvl.addWidget(self.codeInput)

        self.setLayout(self.topLvl)

        self.type = 0

    def addCode(self):
        eval(self.codeInput.text())
        self.codeInput.setText("")

        if self.type == 1:
            self.displaySemesters()
        elif self.type == 2:
            self.displayMajors()
        elif self.type == 3:
            self.displayBack()

    def clean(self):
        for i in reversed(range(self.display.count())): 
            self.display.itemAt(i).widget().setParent(None)

    def displayBack(self):
        self.clean()

        widget1 = QtGui.QTextBrowser()
        widget1.setText(printCourses())
        self.display.addWidget(widget1)

        widget2 = QtGui.QTextBrowser()
        widget2.setHtml(instructionSet())
        self.display.addWidget(widget2)
        self.type = 3

    def displayMajors(self):
        self.clean()
        data = parseClasses()
        for major in allDegrees:
            widget = QtGui.QTextBrowser()
            widget.setHtml(major.output(data))
            self.display.addWidget(widget)

        self.type = 2
            
    def displaySemesters(self):
        self.clean()
        for semester in masterPlan:
            widget = QtGui.QTextBrowser()
            widget.setText(semester.output())
            self.display.addWidget(widget)

        self.type = 1
    

Core = Major("Core", "Common Core")
GenEd = Major("GenEd", "General Education")
CS = Major("CS", "CS BSA")
HC = Major("HC", "Humanities Contract")
CTI = Major("CTI", "Core Texts and Ideas")
ICE = Major("ICE", "I/C/Entrepreneurship")

allDegrees.append(Core)
allDegrees.append(GenEd)
allDegrees.append(CS)
allDegrees.append(HC)
allDegrees.append(CTI)
allDegrees.append(ICE)

S15 = Semester("S15", "Before", 2015, 1)
masterPlan.append(S15)

F15 = Semester("F15", "Fall", 2015, 1)
masterPlan.append(F15)

S16 = Semester("S16", "Spring", 2016, 1)
masterPlan.append(S16)

F16 = Semester("F16", "Fall", 2016, 1)
masterPlan.append(F16)

S17 = Semester("S17", "Spring", 2017)
masterPlan.append(S17)

Su17 = Semester("Su17", "Summer", 2017)
masterPlan.append(Su17)

F17 = Semester("F17", "Fall", 2017)
masterPlan.append(F17)

S18 = Semester("S18", "Spring", 2018)
masterPlan.append(S18)

F18 = Semester("F18", "Fall", 2018)
masterPlan.append(F18)

S19 = Semester("S19", "Spring", 2019)
masterPlan.append(S19)

F19 = Semester("F19", "Fall", 2019)
masterPlan.append(F19)

loadFile()

app = QtGui.QApplication([])

w = Interface()
w.showMaximized()

app.exec_()
