# Hypothetical-IDA
A hypothetical interactive degree audit to determine how close you are to graduating with multiple degree plans.

**Introduction** 

As a student at the University of Texas at Austin, there are so many degree paths that interest me. UT provides us with an Interactive Degree Audit system that allows students to see if they're "on track" for one degree plan and graduating on time. However, it only looks at the present moment and doesn't let students map out their four year course schedule to see if they'll graduate on time in the grand scheme of college. Additionally, if I want to pursue multiple degree paths and make sure I have enough overlap between the degree paths to maximize my education and still graduate on time, I would have no recourse but to manually write all that information out.

Through my *brief* research, I couldn't find any program that helped me easily accomplish all of these goals:
- View a four year master plan for college
- Track the overlap that one course has with multiple degree requirements
- Understand whether pursuing multiple degree paths is feasible in the first place

I then decided to build my own program to accomplish this (through Python's PyQt/PySide library).

**Personal Background**

I am a Computer Science major pursuing a Bachelor of Science and Arts. For this degree, I have to fulfill 
(1) Common Core
(2) General Education
(3) Computer Science-specific courses
(4) a certificate [course plan that's more than a minor and less than a major]

Additionally, I wanted to pursue a double major through Liberal Arts. I was already pursuing a certificate in Core Texts and Ideas (a philosophy program focused on the foundations of America), but I was considering a couple other certificates. This means I was considering two majors, at least two certificates, and my general degree requirements. Trying to figure if I could accomplish all of this in 4 years is extremely complicated, especially if I worked on this by hand. I constantly move classes around and have to track overlap for multiple degrees. Therefore, I felt this app was an absolute necessity for me to map out my college career and maximize my education.

**Program Design**

Each degree path must be entered manually with the required courses. For example, Computer Science requires classes such as Operating Systems and 4 upper division electives. These must be explicitly laid out. Then, you add courses to each semester that satisfy these requirements. You can fill in completed semesters and anticipated courses for upcoming semesters. Once this is done, connect the four year plan to the degree completion by assigning courses as "satisfying" whichever degree path(s). For example, my "Classics of Social and Political Thought" class counts for both Common Core and my certificate requirement. I would say that it satisfies both, and I'm that much closer to finishing my degree plan.

All data is saved to a TXT file in the form of commands. Each time you modify the degree audit, the corresponding function is executed and the line of code needed to execute that function is stored in the TXT file. On the following run, each command from the TXT file is executed (using eval) to bring you to the current state.

Eventually, a four year plan is generated with (hopefully) completed degree paths. Classes can be rearranged and reassigned as necessary. The interface is simple enough that this, often arduous process, is made incredibly easy.
