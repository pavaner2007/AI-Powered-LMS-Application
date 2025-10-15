from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from dateutil import parser
import os
import datetime

# App setup
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///lms.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Extensions
CORS(app, origins=['http://localhost:3000'], supports_credentials=True)
limiter = Limiter(get_remote_address, app=app)
jwt = JWTManager(app)

# Database setup
engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
Session = sessionmaker(bind=engine)
Base = declarative_base()

# Models
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), default='student')
    bio = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

class Course(Base):
    __tablename__ = 'courses'
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    teacher_id = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    teacher = relationship('User', backref='taught_courses')

class Enrollment(Base):
    __tablename__ = 'enrollments'
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('users.id'))
    course_id = Column(Integer, ForeignKey('courses.id'))
    enrolled_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship('User', backref='enrollments')
    course = relationship('Course', backref='enrollments')

class Assignment(Base):
    __tablename__ = 'assignments'
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    course_id = Column(Integer, ForeignKey('courses.id'))
    teacher_id = Column(Integer, ForeignKey('users.id'))
    due_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    course = relationship('Course', backref='assignments')
    teacher = relationship('User', backref='created_assignments')

class Submission(Base):
    __tablename__ = 'submissions'
    id = Column(Integer, primary_key=True)
    assignment_id = Column(Integer, ForeignKey('assignments.id'))
    student_id = Column(Integer, ForeignKey('users.id'))
    content = Column(Text)
    file_path = Column(String(255))
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)

    assignment = relationship('Assignment', backref='submissions')
    student = relationship('User', backref='submissions')

class Grade(Base):
    __tablename__ = 'grades'
    id = Column(Integer, primary_key=True)
    submission_id = Column(Integer, ForeignKey('submissions.id'))
    teacher_id = Column(Integer, ForeignKey('users.id'))
    grade = Column(String(10))
    feedback = Column(Text)
    graded_at = Column(DateTime, default=datetime.datetime.utcnow)

    submission = relationship('Submission', backref='grade')
    teacher = relationship('User', backref='given_grades')

# Create tables
Base.metadata.create_all(engine)

# Routes
@app.route('/api/auth/register', methods=['POST'])
@limiter.limit("10 per minute")
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'student')

    if not all([name, email, password]):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400

    session = Session()
    if session.query(User).filter_by(email=email).first():
        session.close()
        return jsonify({'success': False, 'message': 'User already exists'}), 409

    user = User(name=name, email=email, role=role)
    user.set_password(password)
    session.add(user)
    session.commit()
    access_token = create_access_token(identity=user.id)
    session.close()
    return jsonify({'success': True, 'message': 'User registered', 'data': {'user': {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role}, 'access_token': access_token}}), 201

@app.route('/api/auth/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not all([email, password]):
        return jsonify({'success': False, 'message': 'Missing credentials'}), 400

    session = Session()
    user = session.query(User).filter_by(email=email).first()
    if not user or not user.check_password(password):
        session.close()
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

    access_token = create_access_token(identity=user.id)
    session.close()
    return jsonify({'success': True, 'message': 'Login successful', 'data': {'user': {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role}, 'access_token': access_token}})

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    session = Session()
    user = session.query(User).filter_by(id=user_id).first()
    session.close()
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    return jsonify({'success': True, 'data': {'user': {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role, 'bio': user.bio}}})

@app.route('/api/auth/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.get_json()
    name = data.get('name')
    bio = data.get('bio')
    session = Session()
    user = session.query(User).filter_by(id=user_id).first()
    if not user:
        session.close()
        return jsonify({'success': False, 'message': 'User not found'}), 404
    if name:
        user.name = name
    if bio is not None:
        user.bio = bio
    session.commit()
    session.close()
    return jsonify({'success': True, 'message': 'Profile updated', 'data': {'user': {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role, 'bio': user.bio}}})

@app.route('/api/auth/refresh', methods=['POST'])
@jwt_required()
def refresh_token():
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    return jsonify({'success': True, 'message': 'Token refreshed', 'data': {'access_token': access_token}})

@app.route('/api/courses', methods=['GET'])
@jwt_required()
def get_courses():
    session = Session()
    courses = session.query(Course).all()
    session.close()
    courses_data = [{'id': c.id, 'title': c.title, 'description': c.description, 'teacher': c.teacher.name if c.teacher else None} for c in courses]
    return jsonify({'success': True, 'data': courses_data})

@app.route('/api/courses', methods=['POST'])
@jwt_required()
def create_course():
    user_id = get_jwt_identity()
    session = Session()
    user = session.query(User).filter_by(id=user_id).first()
    if user.role != 'teacher':
        session.close()
        return jsonify({'success': False, 'message': 'Only teachers can create courses'}), 403

    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    course = Course(title=title, description=description, teacher_id=user_id)
    session.add(course)
    session.commit()
    session.close()
    return jsonify({'success': True, 'message': 'Course created', 'data': {'id': course.id, 'title': course.title}}), 201

@app.route('/api/enrollments', methods=['GET'])
@jwt_required()
def get_enrollments():
    user_id = get_jwt_identity()
    session = Session()
    user = session.query(User).filter_by(id=user_id).first()
    if user.role == 'student':
        enrollments = session.query(Enrollment).filter_by(student_id=user_id).all()
    else:
        enrollments = session.query(Enrollment).join(Course).filter(Course.teacher_id == user_id).all()
    session.close()
    enrollments_data = [{'id': e.id, 'student': e.student.name, 'course': e.course.title} for e in enrollments]
    return jsonify({'success': True, 'data': enrollments_data})

@app.route('/api/enrollments', methods=['POST'])
@jwt_required()
def enroll_course():
    user_id = get_jwt_identity()
    data = request.get_json()
    course_id = data.get('courseId')
    session = Session()
    enrollment = Enrollment(student_id=user_id, course_id=course_id)
    session.add(enrollment)
    session.commit()
    session.close()
    return jsonify({'success': True, 'message': 'Enrolled successfully'}), 201

@app.route('/api/assignments', methods=['GET'])
@jwt_required()
def get_assignments():
    user_id = get_jwt_identity()
    session = Session()
    user = session.query(User).filter_by(id=user_id).first()
    if user.role == 'student':
        # Get course IDs the student is enrolled in
        enrolled_courses = session.query(Enrollment.course_id).filter_by(student_id=user_id).all()
        course_ids = [ec[0] for ec in enrolled_courses]
        assignments = session.query(Assignment).filter(Assignment.course_id.in_(course_ids)).all()
    else:
        assignments = session.query(Assignment).filter_by(teacher_id=user_id).all()
    session.close()
    assignments_data = [{'id': a.id, 'title': a.title, 'description': a.description, 'course': a.course.title, 'due_date': a.due_date.isoformat() if a.due_date else None} for a in assignments]
    return jsonify({'success': True, 'data': assignments_data})

@app.route('/api/assignments', methods=['POST'])
@jwt_required()
def create_assignment():
    user_id = get_jwt_identity()
    session = Session()
    user = session.query(User).filter_by(id=user_id).first()
    if user.role != 'teacher':
        session.close()
        return jsonify({'success': False, 'message': 'Only teachers can create assignments'}), 403

    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    course_id = data.get('courseId')
    due_date = data.get('dueDate')
    # Parse due_date string to datetime object if provided
    if due_date:
        try:
            due_date = parser.parse(due_date)
        except Exception:
            session.close()
            return jsonify({'success': False, 'message': 'Invalid due date format'}), 400
    assignment = Assignment(title=title, description=description, course_id=course_id, teacher_id=user_id, due_date=due_date)
    session.add(assignment)
    session.commit()
    session.close()
    return jsonify({'success': True, 'message': 'Assignment created'}), 201

@app.route('/api/submissions', methods=['GET'])
@jwt_required()
def get_submissions():
    user_id = get_jwt_identity()
    session = Session()
    user = session.query(User).filter_by(id=user_id).first()
    if user.role == 'student':
        submissions = session.query(Submission).filter_by(student_id=user_id).all()
    else:
        submissions = session.query(Submission).join(Assignment).filter(Assignment.teacher_id == user_id).all()
    session.close()
    submissions_data = [{'id': s.id, 'assignment': s.assignment.title, 'content': s.content, 'submitted_at': s.submitted_at.isoformat()} for s in submissions]
    return jsonify({'success': True, 'data': submissions_data})

@app.route('/api/submissions', methods=['POST'])
@jwt_required()
def submit_assignment():
    user_id = get_jwt_identity()
    data = request.get_json()
    assignment_id = data.get('assignmentId')
    content = data.get('content')
    session = Session()
    submission = Submission(assignment_id=assignment_id, student_id=user_id, content=content)
    session.add(submission)
    session.commit()
    session.close()
    return jsonify({'success': True, 'message': 'Submission created'}), 201

@app.route('/api/grades', methods=['GET'])
@jwt_required()
def get_grades():
    user_id = get_jwt_identity()
    session = Session()
    user = session.query(User).filter_by(id=user_id).first()
    if user.role == 'student':
        grades = session.query(Grade).join(Submission).filter(Submission.student_id == user_id).all()
    else:
        grades = session.query(Grade).filter_by(teacher_id=user_id).all()
    session.close()
    grades_data = [{'id': g.id, 'submission': g.submission.id, 'grade': g.grade, 'feedback': g.feedback, 'graded_at': g.graded_at.isoformat()} for g in grades]
    return jsonify({'success': True, 'data': grades_data})

@app.route('/api/grades', methods=['POST'])
@jwt_required()
def grade_submission():
    user_id = get_jwt_identity()
    session = Session()
    user = session.query(User).filter_by(id=user_id).first()
    if user.role != 'teacher':
        session.close()
        return jsonify({'success': False, 'message': 'Only teachers can grade'}), 403

    data = request.get_json()
    submission_id = data.get('submissionId')
    grade_value = data.get('grade')
    feedback = data.get('feedback')
    grade = Grade(submission_id=submission_id, teacher_id=user_id, grade=grade_value, feedback=feedback)
    session.add(grade)
    session.commit()
    session.close()
    return jsonify({'success': True, 'message': 'Grade submitted'}), 201

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'OK', 'message': 'LMS Backend is running'})

# Error handlers
@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Endpoint not found'}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
